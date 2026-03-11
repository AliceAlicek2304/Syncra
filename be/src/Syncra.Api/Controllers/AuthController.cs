using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs;
using Syncra.Application.Repositories;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Entities;
using Microsoft.Extensions.Options;
using BC = BCrypt.Net.BCrypt;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IRepository<UserSession> _userSessionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly JwtOptions _jwtOptions;

    public AuthController(
        IUserRepository userRepository, 
        IRefreshTokenRepository refreshTokenRepository,
        IRepository<UserSession> userSessionRepository,
        IUnitOfWork unitOfWork,
        ITokenService tokenService,
        IOptions<JwtOptions> jwtOptions)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _userSessionRepository = userSessionRepository;
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions.Value;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var existingUser = await _userRepository.GetByEmailAsync(registerDto.Email);
        if (existingUser != null)
        {
            return BadRequest(new { Message = "User with this email already exists." });
        }

        var user = new User
        {
            Email = registerDto.Email,
            NormalizedEmail = registerDto.Email.ToUpperInvariant(),
            PasswordHash = BC.HashPassword(registerDto.Password),
            Status = "active",
            Profile = new UserProfile
            {
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                DisplayName = $"{registerDto.FirstName} {registerDto.LastName}"
            }
        };

        await _userRepository.AddAsync(user);
        await _unitOfWork.SaveChangesAsync();
        
        return CreatedAtAction(nameof(Register), new { id = user.Id }, new { Message = "User registered successfully." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        var user = await _userRepository.GetByEmailAsync(loginDto.Email);
        if (user == null || !BC.Verify(loginDto.Password, user.PasswordHash))
        {
            return Unauthorized(new { Message = "Invalid email or password." });
        }

        var token = _tokenService.GenerateJwtToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var refreshTokenHash = HashToken(refreshToken);

        var session = new UserSession
        {
            UserId = user.Id,
            IssuedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpirationDays),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers["User-Agent"].ToString()
        };

        var refreshTokenEntity = new RefreshToken
        {
            TokenHash = refreshTokenHash,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpirationDays),
            Session = session
        };

        await _userSessionRepository.AddAsync(session);
        await _refreshTokenRepository.AddAsync(refreshTokenEntity);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new AuthResponseDto(token, refreshToken, session.ExpiresAtUtc));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshDto refreshDto)
    {
        var refreshTokenHash = HashToken(refreshDto.RefreshToken);
        var existingToken = await _refreshTokenRepository.GetByTokenHashAsync(refreshTokenHash);

        if (existingToken == null || existingToken.RevokedAtUtc != null || existingToken.ExpiresAtUtc < DateTime.UtcNow)
        {
            return Unauthorized(new { Message = "Invalid or expired refresh token." });
        }

        var user = existingToken.Session.User;
        var newToken = _tokenService.GenerateJwtToken(user);
        var newRefreshToken = _tokenService.GenerateRefreshToken();
        var newRefreshTokenHash = HashToken(newRefreshToken);

        // Rotate token
        existingToken.RotatedAtUtc = DateTime.UtcNow;
        
        var nextRefreshToken = new RefreshToken
        {
            TokenHash = newRefreshTokenHash,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpirationDays),
            UserSessionId = existingToken.UserSessionId
        };

        existingToken.ReplacedByTokenId = nextRefreshToken.Id;

        await _refreshTokenRepository.AddAsync(nextRefreshToken);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new AuthResponseDto(newToken, newRefreshToken, existingToken.Session.ExpiresAtUtc));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized();
        }

        if (!Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            return NotFound();
        }

        return Ok(new UserDto(user.Id, user.Email));
    }

    private string HashToken(string token)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashBytes);
    }
}
