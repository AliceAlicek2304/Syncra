using System;
using System.Reflection;

class Program {
    static void Main() {
        try {
            var assembly = Assembly.Load("Zernio");
            var type = assembly.GetType("Zernio.Model.GetTikTokCreatorInfo200Response");
            if (type == null) {
                Console.WriteLine("Type not found.");
                return;
            }
            foreach (var prop in type.GetProperties()) {
                Console.WriteLine(prop.Name + " : " + prop.PropertyType.Name);
            }
            Console.WriteLine("---");
            var creatorInfoType = assembly.GetType("Zernio.Model.TikTokCreatorInfo");
            if (creatorInfoType != null) {
                foreach (var prop in creatorInfoType.GetProperties()) {
                    Console.WriteLine(prop.Name + " : " + prop.PropertyType.Name);
                }
            } else {
                Console.WriteLine("CreatorInfo type not found. Looking at properties of the response...");
                foreach (var prop in type.GetProperties()) {
                    Console.WriteLine("Prop: " + prop.Name);
                }
            }
        } catch (Exception e) {
            Console.WriteLine(e.Message);
        }
    }
}
