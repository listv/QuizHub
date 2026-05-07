using Microsoft.EntityFrameworkCore;
using QuizHub.Data;
using QuizHub.DTOs;
using QuizHub.Models;

namespace QuizHub.Services;

public class QuestionService
{
    private readonly AppDbContext _db;

    public QuestionService(AppDbContext db) => _db = db;

    public async Task<List<QuestionDto>> GetAllAsync(string? category, string? type)
    {
        var query = _db.Questions.Include(q => q.Options).AsQueryable();
        if (!string.IsNullOrEmpty(category)) query = query.Where(q => q.Category == category);
        if (!string.IsNullOrEmpty(type) && Enum.TryParse<QuestionType>(type, true, out var t))
            query = query.Where(q => q.Type == t);

        return await query.OrderByDescending(q => q.CreatedAt)
            .Select(q => MapQuestion(q)).ToListAsync();
    }

    public async Task<QuestionDto?> GetByIdAsync(Guid id)
    {
        var q = await _db.Questions.Include(x => x.Options).FirstOrDefaultAsync(x => x.Id == id);
        return q == null ? null : MapQuestion(q);
    }

    public async Task<List<string>> GetCategoriesAsync()
    {
        return await _db.Questions.Where(q => q.Category != "")
            .Select(q => q.Category).Distinct().OrderBy(c => c).ToListAsync();
    }

    public async Task<QuestionDto> CreateAsync(CreateQuestionRequest req)
    {
        if (!Enum.TryParse<QuestionType>(req.Type, true, out var type))
            throw new ArgumentException("Невірний тип питання");

        var question = new Question
        {
            Text = req.Text,
            Type = type,
            Category = req.Category ?? "",
            Explanation = req.Explanation
        };

        if (type != QuestionType.Open && req.Options != null)
        {
            for (int i = 0; i < req.Options.Count; i++)
                question.Options.Add(new QuestionOption { Text = req.Options[i].Text, IsCorrect = req.Options[i].IsCorrect, SortOrder = i });
        }

        _db.Questions.Add(question);
        await _db.SaveChangesAsync();
        return MapQuestion(question);
    }

    public async Task<QuestionDto?> UpdateAsync(Guid id, UpdateQuestionRequest req)
    {
        var question = await _db.Questions.Include(q => q.Options).FirstOrDefaultAsync(q => q.Id == id);
        if (question == null) return null;

        if (req.Text != null) question.Text = req.Text;
        if (req.Category != null) question.Category = req.Category;
        if (req.Explanation != null) question.Explanation = req.Explanation;
        if (req.Type != null && Enum.TryParse<QuestionType>(req.Type, true, out var type))
            question.Type = type;

        if (req.Options != null)
        {
            var currentOptions = question.Options
                .OrderBy(o => o.SortOrder)
                .Select(o => new { o.Text, o.IsCorrect })
                .ToList();
            var newOptions = req.Options
                .Select(o => new { o.Text, o.IsCorrect })
                .ToList();

            bool optionsChanged = currentOptions.Count != newOptions.Count ||
                currentOptions.Zip(newOptions)
                    .Any(pair => pair.First.Text != pair.Second.Text ||
                                 pair.First.IsCorrect != pair.Second.IsCorrect);
            if (optionsChanged)
            {
                await _db.Database.ExecuteSqlRawAsync(
                    "DELETE FROM \"QuestionOptions\" WHERE \"QuestionId\" = {0}", question.Id);

                foreach (var opt in question.Options)
                    _db.Entry(opt).State = EntityState.Detached;

                question.Options.Clear();

                for (int i = 0; i < req.Options.Count; i++)
                    question.Options.Add(new QuestionOption { Text = req.Options[i].Text, IsCorrect = req.Options[i].IsCorrect, SortOrder = i });
            }
        }

        question.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapQuestion(question);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var question = await _db.Questions.FindAsync(id);
        if (question == null) return false;
        _db.Questions.Remove(question);
        await _db.SaveChangesAsync();
        return true;
    }

    public static QuestionDto MapQuestion(Question q) => new(
        q.Id, q.Text, q.Type.ToString(), q.Category, q.Explanation, q.ImageUrl,
        q.Options.OrderBy(o => o.SortOrder)
            .Select(o => new QuestionOptionDto(o.Id, o.Text, o.IsCorrect, o.SortOrder)).ToList(),
        q.CreatedAt);
}
