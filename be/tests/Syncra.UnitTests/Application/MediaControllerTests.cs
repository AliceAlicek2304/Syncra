using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using Syncra.Api.Controllers;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Xunit;

namespace Syncra.UnitTests.Application;

public class MediaControllerTests
{
    private readonly Mock<IStorageService> _storageServiceMock = new();
    private readonly Mock<IMediaRepository> _mediaRepositoryMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly IOptions<MediaOptions> _mediaOptions = Options.Create(new MediaOptions());

    [Fact]
    public async Task Delete_WhenMediaIsUnattached_ShouldDeleteMediaAndReturnNoContent()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var mediaId = Guid.NewGuid();
        var media = new Media { Id = mediaId, WorkspaceId = workspaceId, FileUrl = "http://localhost/test.jpg" };

        _mediaRepositoryMock.Setup(r => r.GetByIdAsync(mediaId)).ReturnsAsync(media);

        var controller = new MediaController(_storageServiceMock.Object, _mediaRepositoryMock.Object, _unitOfWorkMock.Object, _mediaOptions);

        // Act
        var result = await controller.Delete(workspaceId, mediaId, CancellationToken.None);

        // Assert
        Assert.IsType<NoContentResult>(result);
        _storageServiceMock.Verify(s => s.DeleteAsync("test.jpg"), Times.Once);
        _mediaRepositoryMock.Verify(r => r.DeleteAsync(mediaId), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(CancellationToken.None), Times.Once);
    }

    [Fact]
    public async Task Delete_WhenMediaIsAttached_ShouldReturnConflict()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var mediaId = Guid.NewGuid();
        var media = new Media { Id = mediaId, WorkspaceId = workspaceId, PostId = Guid.NewGuid() };

        _mediaRepositoryMock.Setup(r => r.GetByIdAsync(mediaId)).ReturnsAsync(media);

        var controller = new MediaController(_storageServiceMock.Object, _mediaRepositoryMock.Object, _unitOfWorkMock.Object, _mediaOptions);

        // Act
        var result = await controller.Delete(workspaceId, mediaId, CancellationToken.None);

        // Assert
        var conflictResult = Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal("Cannot delete media that is attached to a post.", conflictResult.Value);
        _storageServiceMock.Verify(s => s.DeleteAsync(It.IsAny<string>()), Times.Never);
        _mediaRepositoryMock.Verify(r => r.DeleteAsync(It.IsAny<Guid>()), Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Delete_WhenMediaNotFound_ShouldReturnNotFound()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var mediaId = Guid.NewGuid();

        _mediaRepositoryMock.Setup(r => r.GetByIdAsync(mediaId)).ReturnsAsync((Media)null);

        var controller = new MediaController(_storageServiceMock.Object, _mediaRepositoryMock.Object, _unitOfWorkMock.Object, _mediaOptions);

        // Act
        var result = await controller.Delete(workspaceId, mediaId, CancellationToken.None);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }
}
