using DotNetEnv;
using SpatialMaps.Api;

Env.NoClobber().TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

var flowDeskBaseUrl = builder.Configuration["FLOWDESK_AI_BASE_URL"];

if (string.IsNullOrWhiteSpace(flowDeskBaseUrl))
{
    throw new InvalidOperationException(
        "FLOWDESK_AI_BASE_URL is missing. Add it to the local .env file.");
}

var flowDeskApiKey = builder.Configuration["SPATIALMAPS_FLOWDESK_API_KEY"];

if (string.IsNullOrWhiteSpace(flowDeskApiKey))
{
    throw new InvalidOperationException(
        "SPATIALMAPS_FLOWDESK_API_KEY is missing. Add it to the local .env file.");
}

builder.Services.AddHttpClient<FlowDeskAiClient>(client =>
{
    client.BaseAddress = new Uri(flowDeskBaseUrl);
    client.Timeout = TimeSpan.FromMinutes(5);
    client.DefaultRequestHeaders.Add("X-FlowDesk-Api-Key", flowDeskApiKey);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("SpatialMapsDev", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("SpatialMapsDev");

app.MapGet("/health", () => Results.Ok(new
{
    service = "SpatialMaps API",
    status = "healthy"
}));

app.MapPost("/api/ai/chat", async (
    FlowDeskAiChatRequest request,
    FlowDeskAiClient client,
    CancellationToken cancellationToken) =>
{
    try
    {
        var result = await client.ChatAsync(request, cancellationToken);

        return Results.Ok(result);
    }
    catch (ArgumentException exception)
    {
        return Results.BadRequest(new { error = exception.Message });
    }
    catch (HttpRequestException exception)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "FlowDesk AI request failed",
            detail: exception.Message);
    }
    catch (InvalidOperationException exception)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status502BadGateway,
            title: "Invalid FlowDesk AI response",
            detail: exception.Message);
    }
});

app.Run();
