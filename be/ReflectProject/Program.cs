using System;
using System.Reflection;
using Zernio.Api;

class Program {
    static void Main() {
        try {
            var type = typeof(ConnectApi);
            Console.WriteLine($"Methods in ConnectApi:");
            foreach (var method in type.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)) {
                Console.WriteLine($"  - {method.ReturnType.Name} {method.Name}({string.Join(", ", System.Linq.Enumerable.Select(method.GetParameters(), p => p.ParameterType.Name))})");
            }
        } catch (Exception ex) {
            Console.WriteLine("Failed: " + ex);
        }
    }
}







