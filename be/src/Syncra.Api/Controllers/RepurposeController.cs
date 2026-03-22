using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Syncra.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/v1/repurpose")]
public class RepurposeController : ControllerBase
{
    private const string OpenAiEndpoint = "https://api.openai.com/v1/chat/completions";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RepurposeController> _logger;

    public RepurposeController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<RepurposeController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] RepurposeGenerateRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.SourceText))
        {
            return BadRequest("sourceText is required.");
        }

        if (request.Platforms is null || request.Platforms.Length == 0)
        {
            return BadRequest("platforms must contain at least one platform.");
        }

        if (string.IsNullOrWhiteSpace(request.Prompt))
        {
            return BadRequest("prompt is required.");
        }

        var apiKey = _configuration["OPENAI_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                "OPENAI_API_KEY is missing. Add it to your backend environment before calling repurpose generation.");
        }

        var model = _configuration["OPENAI_MODEL"] ?? "gpt-4.1-mini";

        var payload = new
        {
            model,
            temperature = 0.3,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new
                {
                    role = "system",
                    content = "You are a helpful assistant that returns strict JSON only."
                },
                new
                {
                    role = "user",
                    content = request.Prompt
                }
            }
        };

        var client = _httpClientFactory.CreateClient();
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, OpenAiEndpoint);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        httpRequest.Content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        using var response = await client.SendAsync(httpRequest, cancellationToken);
        var openAiRaw = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var details = openAiRaw.Length > 500 ? openAiRaw[..500] : openAiRaw;
            _logger.LogError("OpenAI repurpose call failed ({StatusCode}). Response: {Response}", (int)response.StatusCode, details);
            return StatusCode((int)response.StatusCode, $"OpenAI request failed: {details}");
        }

        using var openAiDoc = JsonDocument.Parse(openAiRaw);
        if (!openAiDoc.RootElement.TryGetProperty("choices", out var choices) || choices.ValueKind != JsonValueKind.Array || choices.GetArrayLength() == 0)
        {
            return StatusCode(StatusCodes.Status502BadGateway, "OpenAI response missing choices.");
        }

        var message = choices[0].GetProperty("message");
        if (!message.TryGetProperty("content", out var contentElement))
        {
            return StatusCode(StatusCodes.Status502BadGateway, "OpenAI response missing message.content.");
        }

        var content = contentElement.GetString();
        if (string.IsNullOrWhiteSpace(content))
        {
            return StatusCode(StatusCodes.Status502BadGateway, "OpenAI returned empty content.");
        }

        try
        {
            using var generatedDoc = JsonDocument.Parse(content);
            if (!generatedDoc.RootElement.TryGetProperty("atoms", out var atoms) || atoms.ValueKind != JsonValueKind.Array)
            {
                return StatusCode(StatusCodes.Status502BadGateway, "OpenAI JSON must contain an atoms array.");
            }
        }
        catch (JsonException)
        {
            return StatusCode(StatusCodes.Status502BadGateway, "OpenAI content was not valid JSON.");
        }

        // Return raw JSON object (not markdown-wrapped), matching frontend parser contract.
        return Content(content, "application/json");
    }
}

public sealed class RepurposeGenerateRequest
{
    public string SourceText { get; set; } = string.Empty;
    public string[] Platforms { get; set; } = Array.Empty<string>();
    public string Tone { get; set; } = "default";
    public string Length { get; set; } = "medium";
    public bool ExtractAtoms { get; set; }
    public string Prompt { get; set; } = string.Empty;
}
