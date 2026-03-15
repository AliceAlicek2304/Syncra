using Syncra.Domain.ValueObjects;
using Syncra.Domain.Exceptions;
using Xunit;

namespace Syncra.UnitTests.Domain;

public class ValueObjectTests
{
    #region PostTitle Tests

    [Fact]
    public void PostTitle_Create_ShouldSetValue()
    {
        var title = PostTitle.Create("My Title");
        Assert.Equal("My Title", title.Value);
    }

    [Fact]
    public void PostTitle_Create_ShouldTrim()
    {
        var title = PostTitle.Create("  My Title  ");
        Assert.Equal("My Title", title.Value);
    }

    [Fact]
    public void PostTitle_Create_ShouldThrow_WhenEmpty()
    {
        Assert.Throws<ValidationException>(() => PostTitle.Create(""));
    }

    [Fact]
    public void PostTitle_Create_ShouldThrow_WhenTooLong()
    {
        var longTitle = new string('a', 201);
        Assert.Throws<ValidationException>(() => PostTitle.Create(longTitle));
    }

    [Fact]
    public void PostTitle_Empty_ShouldReturnEmptyInstance()
    {
        var empty = PostTitle.Empty;
        Assert.Equal(string.Empty, empty.Value);
    }

    [Fact]
    public void PostTitle_Equals_ShouldWorkCorrectly()
    {
        var title1 = PostTitle.Create("Same");
        var title2 = PostTitle.Create("Same");
        var title3 = PostTitle.Create("Different");

        Assert.Equal(title1, title2);
        Assert.NotEqual(title1, title3);
    }

    #endregion

    #region PostContent Tests

    [Fact]
    public void PostContent_Create_ShouldSetValue()
    {
        var content = PostContent.Create("My content");
        Assert.Equal("My content", content.Value);
    }

    [Fact]
    public void PostContent_Empty_ShouldReturnEmptyInstance()
    {
        var empty = PostContent.Empty;
        Assert.Equal(string.Empty, empty.Value);
    }

    #endregion

    #region Email Tests

    [Fact]
    public void Email_Create_ShouldSetValue()
    {
        var email = Email.Create("test@example.com");
        Assert.Equal("test@example.com", email.Value);
    }

    [Fact]
    public void Email_Create_ShouldNormalize()
    {
        var email = Email.Create("Test@Example.COM");
        Assert.Equal("test@example.com", email.Value);
    }

    [Fact]
    public void Email_Create_ShouldThrow_WhenInvalid()
    {
        Assert.Throws<ValidationException>(() => Email.Create("not-an-email"));
    }

    [Fact]
    public void Email_CreateOrNull_ShouldReturnNull_WhenInvalid()
    {
        var email = Email.CreateOrNull("invalid");
        Assert.Null(email);
    }

    [Fact]
    public void Email_CreateOrNull_ShouldReturnEmail_WhenValid()
    {
        var email = Email.CreateOrNull("test@example.com");
        Assert.NotNull(email);
    }

    #endregion

    #region WorkspaceName Tests

    [Fact]
    public void WorkspaceName_Create_ShouldSetValue()
    {
        var name = WorkspaceName.Create("My Workspace");
        Assert.Equal("My Workspace", name.Value);
    }

    [Fact]
    public void WorkspaceName_Create_ShouldThrow_WhenEmpty()
    {
        Assert.Throws<ValidationException>(() => WorkspaceName.Create(""));
    }

    [Fact]
    public void WorkspaceName_Create_ShouldThrow_WhenTooLong()
    {
        var longName = new string('a', 101);
        Assert.Throws<ValidationException>(() => WorkspaceName.Create(longName));
    }

    #endregion

    #region WorkspaceSlug Tests

    [Fact]
    public void WorkspaceSlug_Create_ShouldNormalize()
    {
        var slug = WorkspaceSlug.Create("My Workspace");
        Assert.Equal("my-workspace", slug.Value);
    }

    [Fact]
    public void WorkspaceSlug_Create_ShouldThrow_WhenInvalid()
    {
        Assert.Throws<ValidationException>(() => WorkspaceSlug.Create(""));
    }

    [Fact]
    public void WorkspaceSlug_Create_ShouldThrow_WhenTooLong()
    {
        var longSlug = new string('a', 51);
        Assert.Throws<ValidationException>(() => WorkspaceSlug.Create(longSlug));
    }

    #endregion

    #region ScheduledTime Tests

    [Fact]
    public void ScheduledTime_Create_ShouldSetFutureTime()
    {
        var future = DateTime.UtcNow.AddHours(1);
        var scheduled = ScheduledTime.Create(future);

        Assert.True(scheduled.IsInFuture);
        Assert.Equal(future, scheduled.UtcValue);
    }

    [Fact]
    public void ScheduledTime_Create_ShouldSetPastTime()
    {
        var past = DateTime.UtcNow.AddHours(-1);
        var scheduled = ScheduledTime.Create(past);

        Assert.False(scheduled.IsInFuture);
        Assert.Equal(past, scheduled.UtcValue);
    }

    [Fact]
    public void ScheduledTime_Create_ShouldReturnNone_WhenNull()
    {
        var scheduled = ScheduledTime.Create(null);
        Assert.True(scheduled.IsNone);
    }

    [Fact]
    public void ScheduledTime_None_ShouldHaveMinValue()
    {
        var none = ScheduledTime.None;
        Assert.True(none.UtcValue == DateTime.MinValue);
    }

    #endregion
}