using System;
using System.Reflection;

class Program {
    static void Main() {
        try {
            var assembly = Assembly.Load("Zernio");
            var type1 = assembly.GetType("Zernio.Model.GetTikTokCreatorInfo200ResponsePrivacyLevelsInner");
            foreach (var prop in type1.GetProperties()) {
                Console.WriteLine("PrivacyLevelsInner." + prop.Name + " : " + prop.PropertyType.Name);
            }
            var type2 = assembly.GetType("Zernio.Model.GetTikTokCreatorInfo200ResponseCommercialContentTypesInner");
            foreach (var prop in type2.GetProperties()) {
                Console.WriteLine("CommercialContentTypesInner." + prop.Name + " : " + prop.PropertyType.Name);
            }
        } catch (Exception e) {
            Console.WriteLine(e.Message);
        }
    }
}
