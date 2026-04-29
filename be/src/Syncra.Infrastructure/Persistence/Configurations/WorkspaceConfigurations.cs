using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence.Converters;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class WorkspaceConfiguration : BaseEntityConfiguration<Workspace>
{
    public override void Configure(EntityTypeBuilder<Workspace> builder)
    {
        base.Configure(builder);
        builder.ToTable("workspaces");

        builder.Property(e => e.Name).IsRequired().HasMaxLength(100).HasColumnName("name").HasConversion(ValueObjectConverters.WorkspaceNameConverter);
        builder.Property(e => e.Slug).IsRequired().HasMaxLength(50).HasColumnName("slug").HasConversion(ValueObjectConverters.WorkspaceSlugConverter);
        builder.Property(e => e.OwnerUserId).HasColumnName("owner_user_id");
        builder.Property(e => e.BillingProvider).HasMaxLength(50).HasColumnName("billing_provider");
        builder.Property(e => e.BillingCustomerId).HasMaxLength(200).HasColumnName("billing_customer_id");

        builder.HasIndex(e => e.Slug).IsUnique();

        builder.HasMany(e => e.Members)
            .WithOne(m => m.Workspace)
            .HasForeignKey(m => m.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.UsageCounters)
            .WithOne(u => u.Workspace)
            .HasForeignKey(u => u.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Subscription)
            .WithOne(s => s.Workspace)
            .HasForeignKey<Subscription>(s => s.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class WorkspaceMemberConfiguration : BaseWorkspaceEntityConfiguration<WorkspaceMember>
{
    public override void Configure(EntityTypeBuilder<WorkspaceMember> builder)
    {
        base.Configure(builder);
        builder.ToTable("workspace_members");

        builder.Property(e => e.UserId).HasColumnName("user_id");
        builder.Property(e => e.Role).HasMaxLength(50).HasColumnName("role").HasConversion<string>();
        builder.Property(e => e.Status).HasMaxLength(50).HasColumnName("status").HasConversion<string>();
        builder.Property(e => e.InvitedByUserId).HasColumnName("invited_by_user_id");
        builder.Property(e => e.JoinedAtUtc).HasColumnName("joined_at_utc");

        builder.HasIndex(e => new { e.WorkspaceId, e.UserId }).IsUnique();
    }
}
