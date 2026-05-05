using System.Text;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using FluentValidation;
using FluentValidation.AspNetCore;
using Serilog;
using Serilog.Events;
using QuizHub.Data;
using QuizHub.Services;
using QuizHub.Validators;

// ── Serilog bootstrap ──
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting QuizHub API...");

    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ──
    builder.Host.UseSerilog((context, services, config) =>
    {
        config
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .Enrich.WithEnvironmentName()
            .Enrich.WithThreadId()
            .WriteTo.Console(outputTemplate:
                "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
            .WriteTo.File("logs/quizhub-.log", rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 30,
                outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}");
    });

    // ── PostgreSQL ──
    var connStr = builder.Configuration.GetConnectionString("DefaultConnection")!;
    builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connStr));

    // ── Health Checks ──
    builder.Services.AddHealthChecks()
        .AddNpgSql(connStr, name: "postgresql");

    // ── JWT ──
    var jwtKey = builder.Configuration["Jwt:Key"]!;
    if (jwtKey.Contains("Super-Secret") && !builder.Environment.IsDevelopment())
        Log.Warning("JWT key is using default value! Set a secure key in production via JWT_KEY env variable");

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true, ValidateAudience = true,
                ValidateLifetime = true, ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
            };
        });
    builder.Services.AddAuthorization();

    // ── FluentValidation ──
    builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();
    builder.Services.AddFluentValidationAutoValidation();

    // ── Rate Limiting ──
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.OnRejected = async (context, ct) =>
        {
            var ip = context.HttpContext.Connection.RemoteIpAddress;
            Log.Warning("Rate limit exceeded: {IP} → {Path}", ip, context.HttpContext.Request.Path);
            context.HttpContext.Response.ContentType = "application/json";
            await context.HttpContext.Response.WriteAsJsonAsync(
                new { message = "Забагато запитів. Спробуйте пізніше.", retryAfterSeconds = 60 }, ct);
        };

        // General: 100/min per IP (fallback to userId for authenticated)
        options.AddPolicy("general", ctx =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: ctx.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                    { PermitLimit = 100, Window = TimeSpan.FromMinutes(1), QueueLimit = 5 }));

        // Login: 5/min per IP
        options.AddPolicy("login", ctx =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                    { PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));

        // Submit: 10/hour per user
        options.AddPolicy("submit", ctx =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: ctx.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anon",
                factory: _ => new FixedWindowRateLimiterOptions
                    { PermitLimit = 10, Window = TimeSpan.FromHours(1), QueueLimit = 0 }));
    });

    // ── Services ──
    builder.Services.AddScoped<AuthService>();
    builder.Services.AddScoped<QuestionService>();
    builder.Services.AddScoped<TestService>();

    // ── Controllers ──
    builder.Services.AddControllers()
        .AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);

    // ── CORS ──
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.WithOrigins("http://localhost:3000", "http://localhost:4200", "http://localhost:5173")
                .AllowAnyHeader().AllowAnyMethod().AllowCredentials();
        });
    });

    // ── Swagger ──
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "QuizHub API", Version = "v1" });
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization: Bearer {token}", Name = "Authorization",
            In = ParameterLocation.Header, Type = SecuritySchemeType.ApiKey, Scheme = "Bearer"
        });
        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
        });
    });

    var app = builder.Build();

    // ── Request logging ──
    app.UseSerilogRequestLogging(options =>
    {
        options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} → {StatusCode} in {Elapsed:0.0}ms";
        options.EnrichDiagnosticContext = (dc, ctx) =>
        {
            dc.Set("RemoteIP", ctx.Connection.RemoteIpAddress);
            if (ctx.User.Identity?.IsAuthenticated == true)
                dc.Set("UserName", ctx.User.Identity.Name);
        };
    });

    // ── Auto-migrate ──
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
        Log.Information("Database migrated successfully");
    }

    // ── Pipeline ──
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseCors("AllowFrontend");
    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();

    // ── Health check endpoint ──
    app.MapHealthChecks("/health");

    app.MapControllers();

    Log.Information("QuizHub API started");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "QuizHub API terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
