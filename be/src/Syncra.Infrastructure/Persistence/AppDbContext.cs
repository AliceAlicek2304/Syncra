using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<UsageCounter> UsageCounters => Set<UsageCounter>();
    
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();
    
    public DbSet<Integration> Integrations => Set<Integration>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Media> Media => Set<Media>();
    public DbSet<Idea> Ideas => Set<Idea>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ExternalLogin> ExternalLogins => Set<ExternalLogin>();

    public DbSet<ZernioProfile> ZernioProfiles => Set<ZernioProfile>();
    public DbSet<SocialAccount> SocialAccounts => Set<SocialAccount>();
    public DbSet<PostPlatformTarget> PostPlatformTargets => Set<PostPlatformTarget>();
    public DbSet<ZernioWebhookEvent> ZernioWebhookEvents => Set<ZernioWebhookEvent>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();

    public DbSet<RepurposeSession> RepurposeSessions => Set<RepurposeSession>();
    public DbSet<RepurposeAtom> RepurposeAtoms => Set<RepurposeAtom>();

    public DbSet<InboxConversation> InboxConversations => Set<InboxConversation>();
    public DbSet<InboxMessage> InboxMessages => Set<InboxMessage>();
    public DbSet<InboxCommentedPost> InboxCommentedPosts => Set<InboxCommentedPost>();
    public DbSet<InboxCommentThread> InboxCommentThreads => Set<InboxCommentThread>();
    public DbSet<InboxReview> InboxReviews => Set<InboxReview>();
    public DbSet<InboxCommentPrivateReply> InboxCommentPrivateReplies => Set<InboxCommentPrivateReply>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        
        // User seed data is handled via SQL in migration (User entity has private setters)
    }
}
