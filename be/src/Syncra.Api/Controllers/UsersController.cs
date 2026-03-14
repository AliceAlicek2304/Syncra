using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs;
using Syncra.Application.Repositories;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;

    public UsersController(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
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

        var user = await _userRepository.GetByIdWithProfileAsync(userId);
        if (user == null)
        {
            return NotFound();
        }

        var profileDto = new UserProfileDto(
            user.Id,
            user.Email,
            user.Profile?.DisplayName,
            user.Profile?.FirstName,
            user.Profile?.LastName,
            user.Profile?.AvatarUrl,
            user.Profile?.Timezone,
            user.Profile?.Locale
        );

        return Ok(profileDto);
    }
}
