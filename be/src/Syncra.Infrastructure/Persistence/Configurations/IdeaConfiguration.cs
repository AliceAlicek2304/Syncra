using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public class IdeaConfiguration : BaseWorkspaceEntityConfiguration<Idea>
{
    public override void Configure(EntityTypeBuilder<Idea> builder)
    {
        base.Configure(builder);
        builder.ToTable("ideas");

        builder.Property(e => e.Title)
            .IsRequired()
            .HasMaxLength(Idea.TitleMaxLength)
            .HasColumnName("title");

        builder.Property(e => e.Description)
            .HasMaxLength(Idea.DescriptionMaxLength)
            .HasColumnName("description");

        builder.Property(e => e.Status)
            .IsRequired()
            .HasMaxLength(Idea.StatusMaxLength)
            .HasColumnName("status");

        builder.HasOne(e => e.Workspace)
            .WithMany(w => w.Ideas)
            .HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.WorkspaceId, e.Status });
    }
}
