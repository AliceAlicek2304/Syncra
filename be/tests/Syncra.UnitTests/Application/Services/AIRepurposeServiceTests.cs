using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Syncra.Application.DTOs.AI;
using Syncra.Application.DTOs.Repurpose;
using Syncra.Application.Interfaces;
using Syncra.Application.Services;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Services;

public class AIRepurposeServiceTests
{
    private readonly Mock<IAIProvider> _aiProvider = new();
    private readonly Mock<IPromptEngineeringService> _promptEngineer = new();
    private readonly Mock<IRepurposeCache> _cache = new();
    private readonly Mock<IRepurposeRepository> _repository = new();
    private readonly Mock<IPostRepository> _postRepository = new();
    private readonly Mock<IStorageService> _storageService = new();
    private readonly Mock<ILogger<AIRepurposeService>> _logger = new();
    private readonly RepurposeService _v1Fallback;
    private readonly AIRepurposeService _service;
    private readonly Guid _workspaceId = Guid.NewGuid();

    public AIRepurposeServiceTests()
    {
        _v1Fallback = new RepurposeService(new NullLogger<RepurposeService>());

        _promptEngineer.Setup(p => p.BuildPrompt(It.IsAny<RepurposeRequest>()))
            .Returns(new PromptComponents("System Prompt", "User Prompt"));

        _storageService.Setup(s => s.GetPresignedUrl(It.IsAny<string>(), It.IsAny<double>()))
            .Returns<string, double>((url, _) => url);

        _service = new AIRepurposeService(
            _aiProvider.Object,
            _promptEngineer.Object,
            _cache.Object,
            _v1Fallback,
            _repository.Object,
            _postRepository.Object,
            _storageService.Object,
            _logger.Object);
    }

    private static async IAsyncEnumerable<AIStreamEvent> StreamEvents(params AIStreamEvent[] events)
    {
        foreach (var e in events)
        {
            await Task.Yield();
            yield return e;
        }
    }

    [Fact]
    public async Task GenerateStreamAsync_WithImageGeneration_ShouldCallGenerateImageAndSetMediaUrl()
    {
        // Arrange
        var request = new RepurposeRequest(
            SourceText: "My source blog post content",
            Platforms: new[] { "linkedin" },
            Tone: "professional",
            ExtractAtoms: false,
            GenerateMedia: true,
            MediaType: "image"
        );

        var jsonOutput = "{\"atoms\": [{\"platform\": \"linkedin\", \"type\": \"POST\", \"title\": \"Key Takeaway\", \"content\": \"Post content\"}]}";
        
        _aiProvider.Setup(p => p.GenerateStreamAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<AIProviderOptions>(), It.IsAny<CancellationToken>()))
            .Returns(StreamEvents(new TokenEvent(jsonOutput), new CompleteEvent(jsonOutput, 10, 20)));

        _aiProvider.Setup(p => p.GenerateImageAsync(It.Is<string>(prompt => prompt.Contains("Post content")), It.IsAny<CancellationToken>()))
            .ReturnsAsync("uploads/generated-image.png");

        _cache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RepurposeResult?)null);

        // Act
        var eventsList = new List<RepurposeStreamEvent>();
        await foreach (var e in _service.GenerateStreamAsync(_workspaceId, request, default))
        {
            eventsList.Add(e);
        }

        // Assert
        var completeEvent = eventsList.FirstOrDefault(e => e.Type == "complete");
        Assert.NotNull(completeEvent);
        var result = completeEvent.Data as RepurposeResult;
        Assert.NotNull(result);
        Assert.Single(result.Atoms);
        
        var atom = result.Atoms[0];
        Assert.Equal("uploads/generated-image.png", atom.MediaUrl);
        Assert.Equal("image", atom.MediaType);

        _aiProvider.Verify(p => p.GenerateImageAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        _aiProvider.Verify(p => p.GenerateVideoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GenerateStreamAsync_WithVideoGeneration_ShouldCallGenerateVideoAndSetMediaUrl()
    {
        // Arrange
        var request = new RepurposeRequest(
            SourceText: "My source blog post content",
            Platforms: new[] { "linkedin" },
            Tone: "professional",
            ExtractAtoms: false,
            GenerateMedia: true,
            MediaType: "video"
        );

        var jsonOutput = "{\"atoms\": [{\"platform\": \"linkedin\", \"type\": \"POST\", \"title\": \"Key Takeaway\", \"content\": \"Post content\"}]}";

        _aiProvider.Setup(p => p.GenerateStreamAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<AIProviderOptions>(), It.IsAny<CancellationToken>()))
            .Returns(StreamEvents(new TokenEvent(jsonOutput), new CompleteEvent(jsonOutput, 10, 20)));

        _aiProvider.Setup(p => p.GenerateVideoAsync(It.Is<string>(prompt => prompt.Contains("Post content")), It.IsAny<CancellationToken>()))
            .ReturnsAsync("uploads/generated-video.mp4");

        _cache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RepurposeResult?)null);

        // Act
        var eventsList = new List<RepurposeStreamEvent>();
        await foreach (var e in _service.GenerateStreamAsync(_workspaceId, request, default))
        {
            eventsList.Add(e);
        }

        // Assert
        var completeEvent = eventsList.FirstOrDefault(e => e.Type == "complete");
        Assert.NotNull(completeEvent);
        var result = completeEvent.Data as RepurposeResult;
        Assert.NotNull(result);
        Assert.Single(result.Atoms);

        var atom = result.Atoms[0];
        Assert.Equal("uploads/generated-video.mp4", atom.MediaUrl);
        Assert.Equal("video", atom.MediaType);

        _aiProvider.Verify(p => p.GenerateVideoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        _aiProvider.Verify(p => p.GenerateImageAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GenerateStreamAsync_WithMediaGenerationException_ShouldFallbackToMockAssets()
    {
        // Arrange
        var request = new RepurposeRequest(
            SourceText: "My source blog post content",
            Platforms: new[] { "linkedin" },
            Tone: "professional",
            ExtractAtoms: false,
            GenerateMedia: true,
            MediaType: "image"
        );

        var jsonOutput = "{\"atoms\": [{\"platform\": \"linkedin\", \"type\": \"POST\", \"title\": \"Key Takeaway\", \"content\": \"Post content\"}]}";

        _aiProvider.Setup(p => p.GenerateStreamAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<AIProviderOptions>(), It.IsAny<CancellationToken>()))
            .Returns(StreamEvents(new TokenEvent(jsonOutput), new CompleteEvent(jsonOutput, 10, 20)));

        _aiProvider.Setup(p => p.GenerateImageAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("API quota exceeded"));

        _cache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RepurposeResult?)null);

        // Act
        var eventsList = new List<RepurposeStreamEvent>();
        await foreach (var e in _service.GenerateStreamAsync(_workspaceId, request, default))
        {
            eventsList.Add(e);
        }

        // Assert
        var completeEvent = eventsList.FirstOrDefault(e => e.Type == "complete");
        Assert.NotNull(completeEvent);
        var result = completeEvent.Data as RepurposeResult;
        Assert.NotNull(result);
        Assert.Single(result.Atoms);

        var atom = result.Atoms[0];
        Assert.Equal("uploads/mock-image.png", atom.MediaUrl);
        Assert.Equal("image", atom.MediaType);
    }
}
