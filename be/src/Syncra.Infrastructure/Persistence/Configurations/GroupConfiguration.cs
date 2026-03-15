using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class GroupConfiguration : BaseWorkspaceEntityConfiguration<Group>
{
    public override void Configure(EntityTypeBuilder<Group> builder)
    {
        base.Configure(builder);
        builder.ToTable("groups");

        builder.Property(e => e.Name)
            .IsRequired()
            .HasMaxLength(Group.NameMaxLength)
            .HasColumnName("name");

        builder.HasOne(e => e.Workspace)
            .WithMany(w => w.Groups)
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WorkspaceId, e.Name }).IsUnique();
    }
}
