using System;
using System.Reflection;
using System.Linq;

class Program {
    static void Main() {
        try {
            var assembly = Assembly.Load("Zernio");
            Console.WriteLine("Inspecting GetInboxConversationMessages inner types...");

            var msgInnerType = assembly.GetType("Zernio.Model.GetInboxConversationMessages200ResponseMessagesInner");
            if (msgInnerType != null) {
                Console.WriteLine($"\nMessage Inner Type: {msgInnerType.FullName}");
                foreach (var prop in msgInnerType.GetProperties()) {
                    Console.WriteLine($"  {prop.Name} : {prop.PropertyType.FullName}");
                }
            } else {
                Console.WriteLine("GetInboxConversationMessages200ResponseMessagesInner not found!");
            }

            var mediaApiType = assembly.GetType("Zernio.Api.MediaApi");
            if (mediaApiType != null) {
                Console.WriteLine($"\nMediaApi Methods:");
                foreach (var m in mediaApiType.GetMethods()) {
                    if (m.DeclaringType == mediaApiType)
                        Console.WriteLine($"  {m.Name}({string.Join(", ", m.GetParameters().Select(p => p.ParameterType.Name + " " + p.Name))})");
                }
            }

            var attInnerType = assembly.GetType("Zernio.Model.GetInboxConversationMessages200ResponseMessagesInnerAttachmentsInner");
            if (attInnerType != null) {
                Console.WriteLine($"\nAttachment Inner Type: {attInnerType.FullName}");
                foreach (var prop in attInnerType.GetProperties()) {
                    Console.WriteLine($"  {prop.Name} : {prop.PropertyType.FullName}");
                }

                var typeEnumType = assembly.GetType("Zernio.Model.GetInboxConversationMessages200ResponseMessagesInnerAttachmentsInner+TypeEnum");
                if (typeEnumType != null) {
                    Console.WriteLine($"\nTypeEnum Values:");
                    foreach (var v in Enum.GetNames(typeEnumType)) {
                        Console.WriteLine($"  {v}");
                    }
                }
            } else {
                Console.WriteLine("GetInboxConversationMessages200ResponseMessagesInnerAttachmentsInner not found! Let's search types.");
                var matched = assembly.GetTypes().Where(t => t.Name.Contains("MessagesInnerAttachments") || t.Name.Contains("MessagesInnerAttachmentsInner") || (t.Name.Contains("Attachments") && t.FullName.Contains("GetInbox"))).ToList();
                foreach (var m in matched) {
                    Console.WriteLine($"Found matched type: {m.FullName}");
                    foreach (var prop in m.GetProperties()) {
                        Console.WriteLine($"  {prop.Name} : {prop.PropertyType.FullName}");
                    }
                }
            }

        } catch (Exception e) {
            Console.WriteLine(e.Message);
        }
    }
}
