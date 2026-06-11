using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Application.DTOs;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Features.Profiles.Commands;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Repositories;
using Xunit;

namespace Syncra.UnitTests.Application.Profiles;

[Trait("Category", "Profile")]
public class UpdateProfileCommandHandlerTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IZernioClient> _zernioClientMock;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly Mock<ILogger<UpdateProfileCommandHandler>> _loggerMock;
    private readonly UpdateProfileCommandHandler _handler;
    private readonly Guid _workspaceId;
    private readonly Guid _ownerUserId;
    private readonly string _originalName;
    private readonly string _newName;

    public UpdateProfileCommandHandlerTests()
    {
        _workspaceId = Guid.NewGuid();
        _ownerUserId = Guid.NewGuid();
        _originalName = "Original Profile";
        _newName = "Updated Profile";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _zernioClientMock = new Mock<IZernioClient>();
        _zernioProfileRepository = new ZernioProfileRepository(_db);
        _workspaceRepository = new WorkspaceRepository(_db);
        _unitOfWork = new UnitOfWork(_db);
        _loggerMock = new Mock<ILogger<UpdateProfileCommandHandler>>();

        _handler = new UpdateProfileCommandHandler(
            _zernioProfileRepository,
            _workspaceRepository,
            _zernioClientMock.Object,
            _unitOfWork,
            _loggerMock.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    private async Task<Workspace> SeedWorkspaceAsync(Guid? ownerId = null)
    {
        ownerId ??= _ownerUserId;
        var workspace = Workspace.Create(ownerId.Value, "Test Workspace", "test-workspace", "#ff0000", "Test description");
        workspace.Id = _workspaceId;
        _db.Workspaces.Add(workspace);
        await _db.SaveChangesAsync();
        return workspace;
    }

    private async Task<ZernioProfile> SeedProfileAsync(string? avatarUrl = null)
    {
        var profile = ZernioProfile.Create(
            _workspaceId,
            "zernio_profile_1",
            _originalName,
            "all",
            avatarUrl);

        _db.ZernioProfiles.Add(profile);
        await _db.SaveChangesAsync();

        return profile;
    }

    [Fact]
    public async Task Handle_ZernioUpdateSucceeds_UpdatesLocalAggregate()
    {
        await SeedWorkspaceAsync();
        var profile = await SeedProfileAsync("https://example.com/avatar.png");
        var updatedAtBefore = profile.UpdatedAtUtc;

        await Task.Delay(1);

        _zernioClientMock
            .Setup(x => x.UpdateProfileAsync(
                profile.ZernioProfileId,
                _newName,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioProfileDto(_newName, profile.ZernioProfileId));

        var command = new UpdateProfileCommand(
            profile.Id,
            _workspaceId,
            _ownerUserId,
            _newName);

        var result = await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(_newName, result.Name);
        Assert.Equal(profile.Id, result.Id);
        Assert.Equal(profile.AvatarUrl, result.AvatarUrl);
        Assert.Equal("#ff0000", result.Color);

        var savedProfile = await _db.ZernioProfiles.FirstAsync(p => p.Id == profile.Id);
        Assert.Equal(_newName, savedProfile.DisplayName);
        Assert.NotNull(savedProfile.UpdatedAtUtc);
        Assert.True(savedProfile.UpdatedAtUtc > updatedAtBefore,
            "UpdatedAtUtc should be refreshed after aggregate update");
    }

    [Fact]
    public async Task Handle_ZernioUpdateFails_DoesNotMutateLocalState()
    {
        await SeedWorkspaceAsync();
        var profile = await SeedProfileAsync();
        var updatedAtBefore = profile.UpdatedAtUtc;

        _zernioClientMock
            .Setup(x => x.UpdateProfileAsync(
                profile.ZernioProfileId,
                _newName,
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new DomainException("zernio_update_profile_error",
                "Failed to update Zernio profile"));

        var command = new UpdateProfileCommand(
            profile.Id,
            _workspaceId,
            _ownerUserId,
            _newName);

        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("zernio_update_profile_error", exception.Code);

        var savedProfile = await _db.ZernioProfiles.FirstAsync(p => p.Id == profile.Id);
        Assert.Equal(_originalName, savedProfile.DisplayName);
        Assert.Equal(updatedAtBefore, savedProfile.UpdatedAtUtc);
    }

    [Fact]
    public async Task Handle_ProfileNotFound_ThrowsKeyNotFound()
    {
        await SeedWorkspaceAsync();
        var unknownProfileId = Guid.NewGuid();

        _zernioClientMock
            .Setup(x => x.UpdateProfileAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioProfileDto("ignored", "ignored"));

        var command = new UpdateProfileCommand(
            unknownProfileId,
            _workspaceId,
            _ownerUserId,
            "Any Name");

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_ProfileFromDifferentWorkspace_ThrowsKeyNotFound()
    {
        await SeedWorkspaceAsync();
        var otherWorkspaceId = Guid.NewGuid();
        var profile = await SeedProfileAsync();

        _zernioClientMock
            .Setup(x => x.UpdateProfileAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioProfileDto("ignored", "ignored"));

        var command = new UpdateProfileCommand(
            profile.Id,
            otherWorkspaceId,
            _ownerUserId,
            "Any Name");

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_NonOwnerUser_ThrowsUnauthorizedAccess()
    {
        var otherUserId = Guid.NewGuid();
        await SeedWorkspaceAsync();
        var profile = await SeedProfileAsync();

        _zernioClientMock
            .Setup(x => x.UpdateProfileAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioProfileDto("ignored", "ignored"));

        var command = new UpdateProfileCommand(
            profile.Id,
            _workspaceId,
            otherUserId,
            _newName);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        var savedProfile = await _db.ZernioProfiles.FirstAsync(p => p.Id == profile.Id);
        Assert.Equal(_originalName, savedProfile.DisplayName);
    }

    [Fact]
    public async Task Handle_WorkspaceNotFound_ThrowsKeyNotFound()
    {
        var profile = await SeedProfileAsync();
        var orphanWorkspaceId = Guid.NewGuid();

        var command = new UpdateProfileCommand(
            profile.Id,
            orphanWorkspaceId,
            _ownerUserId,
            _newName);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_SuccessfulUpdate_ReturnsProfileDtoWithCorrectValues()
    {
        await SeedWorkspaceAsync();
        var profile = await SeedProfileAsync("https://example.com/avatar.png");

        _zernioClientMock
            .Setup(x => x.UpdateProfileAsync(
                profile.ZernioProfileId,
                _newName,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioProfileDto(_newName, profile.ZernioProfileId));

        var command = new UpdateProfileCommand(
            profile.Id,
            _workspaceId,
            _ownerUserId,
            _newName);

        var result = await _handler.Handle(command, CancellationToken.None);

        Assert.IsType<ProfileDto>(result);
        Assert.Equal(profile.Id, result.Id);
        Assert.Equal(_newName, result.Name);
        Assert.Equal(profile.ZernioProfileId, result.ZernioProfileId);
        Assert.Equal(profile.AvatarUrl, result.AvatarUrl);
        Assert.Equal(profile.IsActive, result.IsActive);
        Assert.Equal("#ff0000", result.Color);
    }
}
