using System;
using Newtonsoft.Json;
using Zernio.Model;

class Program {
    static void Main() {
        try {
            Console.WriteLine("=== Testing DateOnly Deserialization ===");
            string json = @"{
              ""postId"": ""6507a1b2c3d4e5f6a7b8c9d0"",
              ""timeline"": [
                {
                  ""date"": ""2025-01-15"",
                  ""platform"": ""instagram"",
                  ""platformPostId"": ""17902345678901234"",
                  ""impressions"": 1200,
                  ""reach"": 980,
                  ""likes"": 45,
                  ""comments"": 3,
                  ""shares"": 12,
                  ""saves"": 8,
                  ""clicks"": 25,
                  ""views"": 0
                }
              ]
            }";

            var response = JsonConvert.DeserializeObject<GetPostTimeline200Response>(json);
            Console.WriteLine("Deserialization Success!");
            Console.WriteLine("PostId: " + response.PostId);
            Console.WriteLine("Timeline Count: " + response.Timeline.Count);
            Console.WriteLine("First Date: " + response.Timeline[0].Date);
        } catch (Exception ex) {
            Console.WriteLine("Deserialization FAILED with error: " + ex);
        }

        try {
            Console.WriteLine("\n=== Testing DateOnly.ToString(\"o\") ===");
            var d = DateOnly.FromDateTime(DateTime.Today);
            string formatted = d.ToString("o");
            Console.WriteLine("DateOnly.ToString(\"o\") formatted to: " + formatted);
        } catch (Exception ex) {
            Console.WriteLine("DateOnly.ToString(\"o\") FAILED with error: " + ex.Message);
        }
    }
}







