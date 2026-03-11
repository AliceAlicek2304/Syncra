using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public abstract class BaseEntityConfiguration<T> : IEntityTypeConfiguration<T> where T : EntityBase
{
    public virtual void Configure(EntityTypeBuilder<T> builder)
    {
        // Common configuration for EntityBase
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.CreatedAtUtc).IsRequired().HasColumnName("created_at_utc");
        builder.Property(e => e.UpdatedAtUtc).HasColumnName("updated_at_utc");
        builder.Property(e => e.DeletedAtUtc).HasColumnName("deleted_at_utc");
        builder.Property(e => e.Version).IsConcurrencyToken().HasColumnName("version");
        builder.Property(e => e.Metadata).HasColumnType("jsonb").HasColumnName("metadata");

        builder.HasQueryFilter(e => e.DeletedAtUtc == null);
    }
}

public abstract class BaseWorkspaceEntityConfiguration<T> : BaseEntityConfiguration<T> where T : WorkspaceEntityBase
{
    public override void Configure(EntityTypeBuilder<T> builder)
    {
        base.Configure(builder);
        builder.Property(e => e.WorkspaceId).IsRequired().HasColumnName("workspace_id");
    }
}
