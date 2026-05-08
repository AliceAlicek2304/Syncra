## Deferred Items

- **tests/Syncra.UnitTests/Domain/ValueObjectTests.cs**: 7 tests are failing because they expect `Syncra.Domain.Exceptions.ValidationException` but `System.ArgumentException` is being thrown. This is an out-of-scope failure unrelated to Task 2 changes.
