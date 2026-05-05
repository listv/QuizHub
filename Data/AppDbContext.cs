using Microsoft.EntityFrameworkCore;
using QuizHub.Models;

namespace QuizHub.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<Test> Tests => Set<Test>();
    public DbSet<TestQuestion> TestQuestions => Set<TestQuestion>();
    public DbSet<TestResult> TestResults => Set<TestResult>();
    public DbSet<Answer> Answers => Set<Answer>();
    public DbSet<TestAssignment> TestAssignments => Set<TestAssignment>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // ── User ──
        mb.Entity<User>(e =>
        {
            e.HasIndex(u => u.Login).IsUnique();
            e.HasIndex(u => u.Department);
            e.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        });

        // ── Question ──
        mb.Entity<Question>(e =>
        {
            e.HasIndex(q => q.Category);
            e.HasIndex(q => q.Type);
            e.Property(q => q.Type).HasConversion<string>().HasMaxLength(20);
            e.HasMany(q => q.Options)
             .WithOne(o => o.Question)
             .HasForeignKey(o => o.QuestionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Test ↔ Question (many-to-many) ──
        mb.Entity<TestQuestion>(e =>
        {
            e.HasKey(tq => new { tq.TestId, tq.QuestionId });
            e.HasOne(tq => tq.Test).WithMany(t => t.TestQuestions).HasForeignKey(tq => tq.TestId);
            e.HasOne(tq => tq.Question).WithMany(q => q.TestQuestions).HasForeignKey(tq => tq.QuestionId);
        });

        // ── TestResult ──
        mb.Entity<TestResult>(e =>
        {
            e.HasIndex(r => r.UserId);
            e.HasIndex(r => r.TestId);
            e.HasIndex(r => new { r.UserId, r.TestId });

            e.HasOne(r => r.Test).WithMany(t => t.Results).HasForeignKey(r => r.TestId);
            e.HasOne(r => r.User).WithMany(u => u.TestResults).HasForeignKey(r => r.UserId);
            e.HasMany(r => r.Answers).WithOne(a => a.TestResult).HasForeignKey(a => a.TestResultId).OnDelete(DeleteBehavior.Cascade);
            e.Ignore(r => r.Passed);
        });

        // ── Answer ──
        mb.Entity<Answer>(e =>
        {
            e.HasIndex(a => a.TestResultId);
            e.HasIndex(a => a.QuestionId);
            e.HasOne(a => a.Question).WithMany().HasForeignKey(a => a.QuestionId).OnDelete(DeleteBehavior.Restrict);
        });

        // ── TestAssignment ──
        mb.Entity<TestAssignment>(e =>
        {
            e.HasIndex(a => a.TestId);
            e.HasIndex(a => a.UserId);
            e.HasIndex(a => a.Department);
            e.HasOne(a => a.Test).WithMany(t => t.Assignments).HasForeignKey(a => a.TestId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        SeedData(mb);
    }

    private static void SeedData(ModelBuilder mb)
    {
        // Pre-hashed passwords to avoid BCrypt on every migration
        var adminHash = "$2a$11$rK7X1s5TpAz5qGz0Y5Kz6OJ8jYQz3Kz5qGz0Y5Kz6OJ8jYQz3Ka";
        var userHash = "$2a$11$Wz5KpAz5qGz0Y5Kz6OJ8jYQz3Kz5qGz0Y5Kz6OJ8jYQz3Kz5Ka";

        try
        {
            adminHash = BCrypt.Net.BCrypt.HashPassword("admin");
            userHash = BCrypt.Net.BCrypt.HashPassword("1234");
        }
        catch { /* fallback to pre-hashed */ }

        mb.Entity<User>().HasData(
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000001"), Login = "admin", PasswordHash = adminHash, FullName = "Адміністратор", Role = UserRole.Admin, Department = "Управління" },
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000002"), Login = "manager", PasswordHash = userHash, FullName = "Тетяна Іваненко", Role = UserRole.Manager, Department = "Розробка" },
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000003"), Login = "olena", PasswordHash = userHash, FullName = "Олена Коваль", Role = UserRole.Employee, Department = "Маркетинг" },
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000004"), Login = "andrii", PasswordHash = userHash, FullName = "Андрій Шевченко", Role = UserRole.Employee, Department = "Розробка" },
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000005"), Login = "dmytro", PasswordHash = userHash, FullName = "Дмитро Мельник", Role = UserRole.Employee, Department = "Розробка" }
        );
    }
}
