using System.Net.Http.Json;
using System.Text.Json;

namespace SpatialMaps.Api;

public sealed class FlowDeskAiClient(
    HttpClient httpClient,
    IConfiguration configuration)
{
    public async Task<FlowDeskAiChatResponse> ChatAsync(
        FlowDeskAiChatRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            throw new ArgumentException("Message is required.", nameof(request));
        }

        using var response = await httpClient.PostAsJsonAsync(
            "api/ai/chat",
            request,
            cancellationToken);

        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"FlowDesk AI returned {(int)response.StatusCode} {response.ReasonPhrase}: {body}");
        }

        var result = JsonSerializer.Deserialize<FlowDeskAiChatResponse>(
            body,
            new JsonSerializerOptions(JsonSerializerDefaults.Web));

        return result
            ?? throw new InvalidOperationException("FlowDesk AI returned an empty response.");
    }
}

public sealed record FlowDeskAiChatRequest(
    string Message,
    int? TopK = null);

public sealed record FlowDeskAiChatResponse(
    string Answer,
    IReadOnlyList<FlowDeskAiSource> Sources);

public sealed record FlowDeskAiSource(
    Guid ChunkId,
    Guid DocumentId,
    Guid BusinessId,
    string Source,
    int ChunkIndex,
    string Content,
    double Similarity);
