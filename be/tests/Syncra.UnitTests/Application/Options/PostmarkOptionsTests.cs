using FluentAssertions;
using Xunit;
using Syncra.Application.Options;

namespace Syncra.UnitTests.Application.Options;

public class PostmarkOptionsTests
{
    [Fact]
    public void PostmarkOptions_ShouldHaveSectionName()
    {
        // Assert
        PostmarkOptions.SectionName.Should().Be("Postmark");
    }

    [Fact]
    public void PostmarkOptions_ShouldHaveAllProperties()
    {
        // Arrange
        var options = new PostmarkOptions();

        // Assert default values
        options.ApiKey.Should().Be(string.Empty);
        options.FromEmail.Should().Be(string.Empty);
        options.FromName.Should().Be("Syncra Support");
    }
}
