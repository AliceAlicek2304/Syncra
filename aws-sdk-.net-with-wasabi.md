## WASABI ACADEMY

**Product Documentation**


## How do I use AWS SDK for .NET with Wasabi?

```
AWS SDK for C# or .NET has been certified for use with Wasabi.
```
```
This was tested with AWS SDK version 4.
```
```
To use the C#/.NET SDK, execute the following steps.
```
```
1. Make use of Nuget as the package manager as shown in AWS SDK for C# With Wasabi.
```
```
2. Install the AWS SDK for .NET.
```
```
3. Configure and additional AWS CLI profile for Wasabi account using the Wasabi keys (recommended).
```
```
4. See the samples of code below.
```
```
In these examples, we have set the profile name as "wasabi" in the "~/.aws/credentials" file.
```
```
To help our customers use this SDK with Wasabi, we have provided examples for both IAM and S3.
```
```
Replace YourClientInfo/v1.2.3 with your client’s info/version.
```
```
Refer to other examples in the AWS documentation Amazon S3 examples using SDK for .NET (v4).
```
## Creating a User Using IAM

# AWS SDK for .NET With Wasabi

```
These examples discuss the use of Wasabi's us-east-1 storage region. To use other Wasabi storage regions,
```
```
use the appropriate Wasabi service URL as described in Service URLs for Was abi's Storage RegionsService URLs for Was abi's Storage Regions.
```
```
Send all IAM requests to iam.wasabisys.com
```
```
using
```
```
using
System
```
```
System
;
```
##### ;

```
using
```
```
using
System
```
```
System
.
```
##### .

```
Threading
```
```
Threading
.
```
##### .

```
Tasks
```
```
Tasks
;
```
##### ;

```
using
```
```
using
Amazon
```
```
Amazon
.
```
##### .

```
IdentityManagement
```
```
IdentityManagement
;
```
##### ;

```
using
```
```
using
Amazon
```
```
Amazon
.
```
##### .

```
IdentityManagement
```
```
IdentityManagement
.
```
##### .

```
Model
```
```
Model
;
```
##### ;

```
usingusing AmazonAmazon..RuntimeRuntime;;
```
```
using
```
```
using
Amazon
```
```
Amazon
.
```
##### .

```
Runtime
```
```
Runtime
.
```
##### .

```
CredentialManagement
```
```
CredentialManagement
;
```
##### ;

```
namespacenamespace AWSWasabiAWSWasabi
```
```
C# Copy
```

##### {

##### {

publicpublic staticstatic classclass CreateWasabiUserCreateWasabiUser

##### {

##### {

```
private
```
```
private
static
```
```
static
async
```
```
async
Task
```
```
Task
Main
```
```
Main
(
```
##### (

##### )

##### )

##### {{

```
// Wasabi IAM endpoint
```
```
// Wasabi IAM endpoint
```
```
var
```
```
var
iamConfig
```
```
iamConfig
=
```
##### =

```
new
```
```
new
AmazonIdentityManagementServiceConfig
```
```
AmazonIdentityManagementServiceConfig
```
##### {{

```
ServiceURL
```
```
ServiceURL
=
```
##### =

```
"https://iam.wasabisys.com"
```
```
"https://iam.wasabisys.com"
```
##### }

##### }

##### ;

##### ;

```
// Resolve credentials from the named profile via the AWS
```
```
// Resolve credentials from the named profile via the AWS
```
##### SDK.

##### SDK.

```
// Supports static keys, role_arn/source_profile, SSO,
```
```
// Supports static keys, role_arn/source_profile, SSO,
```
session tokens,session tokens,

```
// credential_process, and other supported providers.
```
```
// credential_process, and other supported providers.
```
```
var
```
```
var
chain
```
```
chain
=
```
##### =

```
new
```
```
new
CredentialProfileStoreChain
```
```
CredentialProfileStoreChain
(
```
##### (

##### )

##### )

##### ;

##### ;

ifif ((!!chainchain..TryGetAWSCredentialsTryGetAWSCredentials(("wasabi""wasabi",, outout AWSCredentialsAWSCredentials

creds

creds
)

##### )

##### )

##### )

##### {

##### {

ConsoleConsole..ErrorError..WriteLineWriteLine(("Could not find AWS profile"Could not find AWS profile

'wasabi'"

'wasabi'"
)

##### )

##### ;

##### ;

```
return
```
```
return
;
```
##### ;

##### }}

```
try
```
```
try
```
##### {{

```
using
```
```
using
var
```
```
var
iam
```
```
iam
=
```
##### =

```
new
```
```
new
```
AmazonIdentityManagementServiceClient

AmazonIdentityManagementServiceClient
(

##### (

```
creds
```
```
creds
,
```
##### ,

```
iamConfig
```
```
iamConfig
)
```
##### )

##### ;

##### ;

```
var
```
```
var
createUserRequest
```
```
createUserRequest
=
```
##### =

```
new
```
```
new
CreateUserRequest
```
```
CreateUserRequest
```
##### {

##### {

```
UserName
```
```
UserName
=
```
##### =

```
"c-sharp-user"
```
```
"c-sharp-user"
```
##### }

##### }

##### ;

##### ;

```
var
```
```
var
resp
```
```
resp
=
```
##### =

```
await
```
```
await
iam
```
```
iam
.
```
##### .

```
CreateUserAsync
```
```
CreateUserAsync
(
```
##### (

```
createUserRequest
```
```
createUserRequest
)
```
##### )

##### ;

##### ;

ConsoleConsole..WriteLineWriteLine(($$"Created user: {resp.User?.UserName}"Created user: {resp.User?.UserName}

({resp.User?.Arn})"

({resp.User?.Arn})"
)

##### )

##### ;

##### ;

##### }

##### }

catchcatch ((AmazonIdentityManagementServiceExceptionAmazonIdentityManagementServiceException ee))

##### {

##### {

```
// Surface the actual IAM error from Wasabi
```
```
// Surface the actual IAM error from Wasabi
```
ConsoleConsole..ErrorError..WriteLineWriteLine(($$"IAM error: {e.Message}""IAM error: {e.Message}"));;

##### }

##### }


### Creating a Bucket

```
catch
```
```
catch
(
```
##### (

```
AmazonClientException
```
```
AmazonClientException
e
```
```
e
)
```
##### )

##### {{

```
// SDK/client-side issues (network, config, credential
```
```
// SDK/client-side issues (network, config, credential
```
```
resolution issues, etc.)
```
```
resolution issues, etc.)
```
```
ConsoleConsole..ErrorError..WriteLineWriteLine(($$"Client error: {e.Message}""Client error: {e.Message}"));;
```
##### }

##### }

```
catch
```
```
catch
(
```
##### (

```
Exception
```
```
Exception
e
```
```
e
)
```
##### )

##### {{

```
Console
```
```
Console
.
```
##### .

```
Error
```
```
Error
.
```
##### .

```
WriteLine
```
```
WriteLine
(
```
##### (

##### $

##### $

```
"Unexpected error: {e}"
```
```
"Unexpected error: {e}"
)
```
##### )

##### ;

##### ;

##### }

##### }

##### }

##### }

##### }

##### }

##### }

##### }

#### using

#### using

#### Amazon

#### Amazon

#### .

#### .

#### Runtime

#### Runtime

#### ;

#### ;

#### usingusing AmazonAmazon..RuntimeRuntime..CredentialManagementCredentialManagement;;

#### usingusing AmazonAmazon..S3S3;;

#### using

#### using

#### Amazon

#### Amazon

#### .

#### .

#### S

#### S

#### .

#### .

#### Model

#### Model

#### ;

#### ;

#### namespace

#### namespace

#### AWSWasabi

#### AWSWasabi

#### {

#### {

#### publicpublic staticstatic classclass CreateWasabiBucketCreateWasabiBucket

#### {

#### {

#### private

#### private

#### static

#### static

#### IAmazonS

#### IAmazonS

#### _s3Client

#### _s3Client

#### =

#### =

#### null

#### null

#### !

#### !

#### ;

#### ;

#### private

#### private

#### const

#### const

#### string

#### string

#### BucketName

#### BucketName

#### =

#### =

#### "mt-aws-sdk-

#### "mt-aws-sdk-

#### test"test";;

#### private

#### private

#### static

#### static

#### async

#### async

#### Task

#### Task

#### Main

#### Main

#### (

#### (

#### )

#### )

#### {

#### {

#### // 1. Configure the S3-compatible endpoint

#### // 1. Configure the S3-compatible endpoint

#### (Wasabi) using the correct URL for your

#### (Wasabi) using the correct URL for your

```
C# Copy
```

#### // bucket's region and your client's info// bucket's region and your client's info

#### and version number

#### and version number

#### var

#### var

#### config

#### config

#### =

#### =

#### new

#### new

#### AmazonS3Config

#### AmazonS3Config

#### {

#### {

#### ServiceURL

#### ServiceURL

#### =

#### =

#### "https://s3.us-east-

#### "https://s3.us-east-

#### 1.wasabisys.com"1.wasabisys.com",,

#### ClientAppId

#### ClientAppId

#### =

#### =

#### "YourClientInfo/v1.2.3"

#### "YourClientInfo/v1.2.3"

#### // adds: app/YourClientInfo/v1.2.3 to

#### // adds: app/YourClientInfo/v1.2.3 to

#### // the User-Agent header

#### // the User-Agent header

#### }};;

#### // 2. Load credentials from a named

#### // 2. Load credentials from a named

#### profile (replaces StoredProfileAWSCredentials)

#### profile (replaces StoredProfileAWSCredentials)

#### var

#### var

#### chain

#### chain

#### =

#### =

#### new

#### new

#### CredentialProfileStoreChain

#### CredentialProfileStoreChain

#### (

#### (

#### )

#### )

#### ;

#### ;

#### ifif ((!!chainchain..TryGetAWSCredentialsTryGetAWSCredentials(("wasabi""wasabi",,

#### out

#### out

#### AWSCredentials

#### AWSCredentials

#### awsCredentials

#### awsCredentials

#### )

#### )

#### )

#### )

#### {

#### {

#### Console

#### Console

#### .

#### .

#### WriteLine

#### WriteLine

#### (

#### (

#### "Could not find AWS

#### "Could not find AWS

#### profile 'wasabi'"

#### profile 'wasabi'"

#### )

#### )

#### ;

#### ;

#### returnreturn;;

#### }}

#### // 3. Create S3 client with credentials

#### // 3. Create S3 client with credentials

#### and config

#### and config

#### _s3Client _s3Client == newnew

#### AmazonS3ClientAmazonS3Client((awsCredentialsawsCredentials,, configconfig));;

#### await

#### await

#### CreateBucket

#### CreateBucket

#### (

#### (

#### _s3Client

#### _s3Client

#### ,

#### ,

#### BucketName

#### BucketName

#### )

#### )

#### ;

#### ;

#### }

#### }

#### private

#### private

#### static

#### static

#### async

#### async

#### Task

#### Task

#### CreateBucket

#### CreateBucket

#### (

#### (


### Uploading an Object to the Bucket

#### IAmazonS3IAmazonS3 clientclient,,

#### string

#### string

#### bucketName

#### bucketName

#### )

#### )

#### {

#### {

#### try

#### try

#### {

#### {

#### varvar putBucketRequest putBucketRequest == newnew

#### PutBucketRequest

#### PutBucketRequest

#### {

#### {

#### BucketName

#### BucketName

#### =

#### =

#### bucketName

#### bucketName

#### }

#### }

#### ;

#### ;

#### awaitawait

#### client

#### client

#### .

#### .

#### PutBucketAsync

#### PutBucketAsync

#### (

#### (

#### putBucketRequest

#### putBucketRequest

#### )

#### )

#### ;

#### ;

#### Console

#### Console

#### .

#### .

#### WriteLine

#### WriteLine

#### (

#### (

#### "Create bucket

#### "Create bucket

#### completed."

#### completed."

#### )

#### )

#### ;

#### ;

#### }

#### }

#### catchcatch ((AmazonS3ExceptionAmazonS3Exception ee))

#### {

#### {

#### Console

#### Console

#### .

#### .

#### WriteLine

#### WriteLine

#### (

#### (

#### $

#### $

#### "Error:

#### "Error:

#### {e.Message}"

#### {e.Message}"

#### )

#### )

#### ;

#### ;

#### }

#### }

#### }}

#### }}

#### }

#### }

```
Wasabi currently does not support the value STREAMING-AWS4-HMAC-SHA256-PAYLOAD-TRAILER for the X-
```
```
Amz-Content-Sha256 header. As a result, we recommend disabling chunked transfer encoding in applications
```
```
while uploading the object using the .NET SDK by setting UseChunkEncoding = false until support is available.
```
```
using
```
```
using
Amazon
```
```
Amazon
.
```
##### .

```
Runtime
```
```
Runtime
;
```
##### ;

```
C# Copy
```

using

using
Amazon

```
Amazon
.
```
##### .

```
Runtime
```
```
Runtime
.
```
##### .

```
CredentialManagement
```
```
CredentialManagement
;
```
##### ;

usingusing AmazonAmazon..S3S3;;

using

using
Amazon

```
Amazon
.
```
##### .

##### S

##### S

##### .

##### .

```
Model
```
```
Model
;
```
##### ;

namespacenamespace AWSWasabiAWSWasabi

##### {

##### {

```
public
```
```
public
static
```
```
static
class
```
```
class
UploadWasabiObject
```
```
UploadWasabiObject
```
##### {{

```
private
```
```
private
static
```
```
static
IAmazonS
```
```
IAmazonS
_s3Client
```
```
_s3Client
=
```
##### =

```
null
```
```
null
!
```
##### !

##### ;

##### ;

```
private
```
```
private
const
```
```
const
string
```
```
string
BucketName
```
```
BucketName
=
```
##### =

```
"mt-aws-sdk-test"
```
```
"mt-aws-sdk-test"
;
```
##### ;

```
private
```
```
private
const
```
```
const
string
```
```
string
ObjectName
```
```
ObjectName
=
```
##### =

```
"test.txt"
```
```
"test.txt"
;
```
##### ;

```
// Updated to take any object from the desktop, just adjust the
```
```
// Updated to take any object from the desktop, just adjust the
```
file name abovefile name above

```
private
```
```
private
static
```
```
static
readonly
```
```
readonly
string
```
```
string
PathToDesktop
```
```
PathToDesktop
=
```
##### =

EnvironmentEnvironment..GetFolderPathGetFolderPath((EnvironmentEnvironment..SpecialFolderSpecialFolder..DesktopDesktop));;

```
private
```
```
private
static
```
```
static
async
```
```
async
Task
```
```
Task
Main
```
```
Main
(
```
##### (

##### )

##### )

##### {{

```
// 1. Configure the S3-compatible endpoint (Wasabi) using
```
```
// 1. Configure the S3-compatible endpoint (Wasabi) using
```
the correct URL for your

the correct URL for your

// bucket's region and your client's info and version number// bucket's region and your client's info and version number

```
var
```
```
var
config
```
```
config
=
```
##### =

```
new
```
```
new
AmazonS3Config
```
```
AmazonS3Config
```
##### {

##### {

ServiceURL ServiceURL == "https://s3.us-east-1.wasabisys.com""https://s3.us-east-1.wasabisys.com",,

```
ClientAppId
```
```
ClientAppId
=
```
##### =

```
"YourClientInfo/v1.2.3"
```
```
"YourClientInfo/v1.2.3"
// adds:
```
```
// adds:
```
app/YourClientInfo/v1.2.3 to

app/YourClientInfo/v1.2.3 to

// the User-// the User-

Agent header

Agent header

##### }

##### }

##### ;

##### ;

```
// 2. Load credentials from a named profile (replaces
```
```
// 2. Load credentials from a named profile (replaces
```
StoredProfileAWSCredentials)

StoredProfileAWSCredentials)

```
var
```
```
var
chain
```
```
chain
=
```
##### =

```
new
```
```
new
CredentialProfileStoreChain
```
```
CredentialProfileStoreChain
(
```
##### (

##### )

##### )

##### ;

##### ;

ifif ((!!chainchain..TryGetAWSCredentialsTryGetAWSCredentials(("wasabi""wasabi",, outout AWSCredentialsAWSCredentials

awsCredentials

awsCredentials
)

##### )

##### )

##### )

##### {

##### {

ConsoleConsole..WriteLineWriteLine(("Could not find AWS profile"Could not find AWS profile

'wasabi'"

'wasabi'"
)

##### )

##### ;

##### ;

```
return
```
```
return
;
```
##### ;

##### }}


### Reading an Object From the Bucket

```
// 3. Create S3 client with credentials and config
```
```
// 3. Create S3 client with credentials and config
```
```
_s3Client _s3Client == newnew AmazonS3ClientAmazonS3Client((awsCredentialsawsCredentials,, configconfig));;
```
```
// The method expects the full path, including the file
```
```
// The method expects the full path, including the file
```
```
name.name.
```
```
var
```
```
var
path
```
```
path
=
```
##### =

```
Path
```
```
Path
.
```
##### .

```
Combine
```
```
Combine
(
```
##### (

```
PathToDesktop
```
```
PathToDesktop
,
```
##### ,

```
ObjectName
```
```
ObjectName
)
```
##### )

##### ;

##### ;

```
awaitawait UploadObjectFromFileAsyncUploadObjectFromFileAsync((_s3Client_s3Client,, BucketNameBucketName,,
```
```
ObjectName
```
```
ObjectName
,
```
##### ,

```
path
```
```
path
)
```
##### )

##### ;

##### ;

##### }

##### }

```
private
```
```
private
static
```
```
static
async
```
```
async
Task
```
```
Task
UploadObjectFromFileAsync
```
```
UploadObjectFromFileAsync
(
```
##### (

```
IAmazonS
```
```
IAmazonS
client
```
```
client
,
```
##### ,

```
string
```
```
string
bucketName
```
```
bucketName
,
```
##### ,

```
stringstring objectNameobjectName,,
```
```
string
```
```
string
filePath
```
```
filePath
)
```
##### )

##### {

##### {

```
trytry
```
##### {

##### {

```
var
```
```
var
putRequest
```
```
putRequest
=
```
##### =

```
new
```
```
new
PutObjectRequest
```
```
PutObjectRequest
```
##### {{

```
BucketName
```
```
BucketName
=
```
##### =

```
bucketName
```
```
bucketName
,
```
##### ,

```
Key
```
```
Key
=
```
##### =

```
objectName
```
```
objectName
,
```
##### ,

```
FilePath FilePath == filePathfilePath,,
```
```
UseChunkEncoding
```
```
UseChunkEncoding
=
```
##### =

```
false
```
```
false
```
##### }

##### }

##### ;

##### ;

```
putRequest
```
```
putRequest
.
```
##### .

```
Metadata
```
```
Metadata
.
```
##### .

```
Add
```
```
Add
(
```
##### (

```
"x-amz-meta-title"
```
```
"x-amz-meta-title"
,
```
##### ,

```
"someTitle"
```
```
"someTitle"
)
```
##### )

##### ;

##### ;

```
await
```
```
await
client
```
```
client
.
```
##### .

```
PutObjectAsync
```
```
PutObjectAsync
(
```
##### (

```
putRequest
```
```
putRequest
)
```
##### )

##### ;

##### ;

```
Console
```
```
Console
.
```
##### .

```
WriteLine
```
```
WriteLine
(
```
##### (

```
"Upload completed."
```
```
"Upload completed."
)
```
##### )

##### ;

##### ;

##### }

##### }

```
catch
```
```
catch
(
```
##### (

```
AmazonS3Exception
```
```
AmazonS3Exception
e
```
```
e
)
```
##### )

##### {

##### {

```
Console
```
```
Console
.
```
##### .

```
WriteLine
```
```
WriteLine
(
```
##### (

##### $

##### $

```
"Error: {e.Message}"
```
```
"Error: {e.Message}"
)
```
##### )

##### ;

##### ;

##### }}

##### }

##### }

##### }

##### }

##### }}


usingusing AmazonAmazon..RuntimeRuntime;;

using

using
Amazon

```
Amazon
.
```
##### .

```
Runtime
```
```
Runtime
.
```
##### .

```
CredentialManagement
```
```
CredentialManagement
;
```
##### ;

using

using
Amazon

```
Amazon
.
```
##### .

##### S

##### S

##### ;

##### ;

usingusing AmazonAmazon..S3S3..ModelModel;;

namespace

namespace
AWSWasabi

```
AWSWasabi
```
##### {{

```
public
```
```
public
static
```
```
static
class
```
```
class
DownloadWasabiObject
```
```
DownloadWasabiObject
```
##### {

##### {

privateprivate staticstatic IAmazonS3IAmazonS3 _s3Client _s3Client == nullnull!!;;

```
private
```
```
private
const
```
```
const
string
```
```
string
BucketName
```
```
BucketName
=
```
##### =

```
"mt-aws-sdk-test"
```
```
"mt-aws-sdk-test"
;
```
##### ;

```
private
```
```
private
const
```
```
const
string
```
```
string
ObjectName
```
```
ObjectName
=
```
##### =

```
"test.txt"
```
```
"test.txt"
;
```
##### ;

```
private
```
```
private
static
```
```
static
async
```
```
async
Task
```
```
Task
Main
```
```
Main
(
```
##### (

##### )

##### )

##### {

##### {

// 1. Configure the S3-compatible endpoint (Wasabi) using// 1. Configure the S3-compatible endpoint (Wasabi) using

the correct URL for your

the correct URL for your

```
// bucket's region and your client's info and version number
```
```
// bucket's region and your client's info and version number
```
varvar config config == newnew AmazonS3ConfigAmazonS3Config

##### {

##### {

```
ServiceURL
```
```
ServiceURL
=
```
##### =

```
"https://s3.us-east-1.wasabisys.com"
```
```
"https://s3.us-east-1.wasabisys.com"
,
```
##### ,

ClientAppId ClientAppId == "YourClientInfo/v1.2.3""YourClientInfo/v1.2.3" // adds:// adds:

app/YourClientInfo/v1.2.3 to

app/YourClientInfo/v1.2.3 to

```
// the User-
```
```
// the User-
```
Agent headerAgent header

##### }

##### }

##### ;

##### ;

// 2. Load credentials from a named profile (replaces// 2. Load credentials from a named profile (replaces

StoredProfileAWSCredentials)

StoredProfileAWSCredentials)

```
var
```
```
var
chain
```
```
chain
=
```
##### =

```
new
```
```
new
CredentialProfileStoreChain
```
```
CredentialProfileStoreChain
(
```
##### (

##### )

##### )

##### ;

##### ;

ifif ((!!chainchain..TryGetAWSCredentialsTryGetAWSCredentials(("wasabi""wasabi",, outout AWSCredentialsAWSCredentials

awsCredentials

awsCredentials
)

##### )

##### )

##### )

##### {

##### {

```
Console
```
```
Console
.
```
##### .

```
WriteLine
```
```
WriteLine
(
```
##### (

```
"Could not find AWS profile
```
```
"Could not find AWS profile
```
'wasabi'"

'wasabi'"
)

##### )

##### ;

##### ;

```
return
```
```
return
;
```
##### ;

##### }

##### }

```
// 3. Create S3 client with credentials and config
```
```
// 3. Create S3 client with credentials and config
```
```
_s3Client
```
```
_s3Client
=
```
##### =

```
new
```
```
new
AmazonS3Client
```
```
AmazonS3Client
(
```
##### (

```
awsCredentials
```
```
awsCredentials
,
```
##### ,

```
config
```
```
config
)
```
##### )

##### ;

##### ;

```
await
```
```
await
GetObject
```
```
GetObject
(
```
##### (

```
_s3Client
```
```
_s3Client
,
```
##### ,

```
BucketName
```
```
BucketName
,
```
##### ,

```
ObjectName
```
```
ObjectName
)
```
##### )

##### ;

##### ;

C# Copy


### Deleting the Object From the Bucket

##### }

##### }

```
private
```
```
private
static
```
```
static
async
```
```
async
Task
```
```
Task
GetObject
```
```
GetObject
(
```
##### (

```
IAmazonS
```
```
IAmazonS
client
```
```
client
,
```
##### ,

```
stringstring bucketNamebucketName,,
```
```
string
```
```
string
objectName
```
```
objectName
)
```
##### )

##### {

##### {

```
trytry
```
##### {

##### {

```
var
```
```
var
getRequest
```
```
getRequest
=
```
##### =

```
new
```
```
new
GetObjectRequest
```
```
GetObjectRequest
(
```
##### (

##### )

##### )

##### {

##### {

```
BucketName
```
```
BucketName
=
```
##### =

```
bucketName
```
```
bucketName
,
```
##### ,

```
Key
```
```
Key
=
```
##### =

```
objectName
```
```
objectName
,
```
##### ,

##### }

##### }

##### ;

##### ;

```
using
```
```
using
var
```
```
var
response
```
```
response
=
```
##### =

```
await
```
```
await
```
```
client
```
```
client
.
```
##### .

```
GetObjectAsync
```
```
GetObjectAsync
(
```
##### (

```
getRequest
```
```
getRequest
)
```
##### )

##### ;

##### ;

```
string
```
```
string
desktop
```
```
desktop
=
```
##### =

```
Environment
```
```
Environment
.
```
##### .

```
GetFolderPath
```
```
GetFolderPath
(
```
##### (

```
Environment
```
```
Environment
.
```
##### .

```
SpecialFolder
```
```
SpecialFolder
.
```
##### .

```
Desktop
```
```
Desktop
)
```
##### )

##### ;

##### ;

```
stringstring localPath localPath == PathPath..CombineCombine((desktopdesktop,, objectNameobjectName));;
```
```
await
```
```
await
using
```
```
using
var
```
```
var
fileStream
```
```
fileStream
=
```
##### =

```
File
```
```
File
.
```
##### .

```
Create
```
```
Create
(
```
##### (

```
localPath
```
```
localPath
)
```
##### )

##### ;

##### ;

```
await
```
```
await
response
```
```
response
.
```
##### .

```
ResponseStream
```
```
ResponseStream
.
```
##### .

```
CopyToAsync
```
```
CopyToAsync
(
```
##### (

```
fileStream
```
```
fileStream
)
```
##### )

##### ;

##### ;

```
Console
```
```
Console
.
```
##### .

```
WriteLine
```
```
WriteLine
(
```
##### (

##### $

##### $

```
"Downloaded to: {localPath}"
```
```
"Downloaded to: {localPath}"
)
```
##### )

##### ;

##### ;

##### }

##### }

```
catchcatch ((AmazonS3ExceptionAmazonS3Exception ee))
```
##### {

##### {

```
Console
```
```
Console
.
```
##### .

```
WriteLine
```
```
WriteLine
(
```
##### (

##### $

##### $

```
"Error: {e.Message}"
```
```
"Error: {e.Message}"
)
```
##### )

##### ;

##### ;

##### }}

##### }

##### }

##### }

##### }

##### }

##### }

```
using
```
```
using
Amazon
```
```
Amazon
.
```
##### .

```
Runtime
```
```
Runtime
;
```
##### ;

```
using
```
```
using
Amazon
```
```
Amazon
.
```
##### .

```
Runtime
```
```
Runtime
.
```
##### .

```
CredentialManagement
```
```
CredentialManagement
;
```
##### ;

```
using
```
```
using
Amazon
```
```
Amazon
.
```
##### .

##### S

##### S

##### ;

##### ;

```
using
```
```
using
Amazon
```
```
Amazon
.
```
##### .

##### S

##### S

##### .

##### .

```
Model
```
```
Model
;
```
##### ;

```
C# Copy
```

namespace

namespace
AWSWasabi

```
AWSWasabi
```
##### {{

```
public
```
```
public
static
```
```
static
class
```
```
class
DeleteObjectFromWasabi
```
```
DeleteObjectFromWasabi
```
##### {

##### {

privateprivate staticstatic IAmazonS3IAmazonS3 _s3Client _s3Client == nullnull!!;;

```
private
```
```
private
const
```
```
const
string
```
```
string
BucketName
```
```
BucketName
=
```
##### =

```
"mt-aws-sdk-test"
```
```
"mt-aws-sdk-test"
;
```
##### ;

privateprivate constconst stringstring ObjectName1 ObjectName1 == "test.txt""test.txt";;

```
private
```
```
private
static
```
```
static
async
```
```
async
Task
```
```
Task
Main
```
```
Main
(
```
##### (

##### )

##### )

##### {

##### {

```
// 1. Configure the S3-compatible endpoint (Wasabi) using
```
```
// 1. Configure the S3-compatible endpoint (Wasabi) using
```
the correct URL for your

the correct URL for your

```
// bucket's region and your client's info and version number
```
```
// bucket's region and your client's info and version number
```
varvar config config == newnew AmazonS3ConfigAmazonS3Config

##### {

##### {

```
ServiceURL
```
```
ServiceURL
=
```
##### =

```
"http://s3.us-east-1.wasabisys.com"
```
```
"http://s3.us-east-1.wasabisys.com"
,
```
##### ,

ClientAppId ClientAppId == "YourClientInfo/v1.2.3""YourClientInfo/v1.2.3" // adds:// adds:

app/YourClientInfo/v1.2.3 to

app/YourClientInfo/v1.2.3 to

```
// the User-
```
```
// the User-
```
Agent headerAgent header

##### }

##### }

##### ;

##### ;

// 2. Load credentials from a named profile (replaces// 2. Load credentials from a named profile (replaces

StoredProfileAWSCredentials)

StoredProfileAWSCredentials)

```
var
```
```
var
chain
```
```
chain
=
```
##### =

```
new
```
```
new
CredentialProfileStoreChain
```
```
CredentialProfileStoreChain
(
```
##### (

##### )

##### )

##### ;

##### ;

ifif ((!!chainchain..TryGetAWSCredentialsTryGetAWSCredentials(("wasabi""wasabi",, outout AWSCredentialsAWSCredentials

awsCredentials

awsCredentials
)

##### )

##### )

##### )

##### {

##### {

ConsoleConsole..WriteLineWriteLine(("Could not find AWS profile"Could not find AWS profile

'wasabi'"

'wasabi'"
)

##### )

##### ;

##### ;

```
return
```
```
return
;
```
##### ;

##### }

##### }

```
// 3. Create S3 client with credentials and config
```
```
// 3. Create S3 client with credentials and config
```
```
_s3Client
```
```
_s3Client
=
```
##### =

```
new
```
```
new
AmazonS3Client
```
```
AmazonS3Client
(
```
##### (

```
awsCredentials
```
```
awsCredentials
,
```
##### ,

```
config
```
```
config
)
```
##### )

##### ;

##### ;

```
await
```
```
await
DeleteObject
```
```
DeleteObject
(
```
##### (

```
_s3Client
```
```
_s3Client
,
```
##### ,

```
BucketName
```
```
BucketName
,
```
##### ,

```
ObjectName
```
```
ObjectName
)
```
##### )

##### ;

##### ;

##### }

##### }

```
private
```
```
private
static
```
```
static
async
```
```
async
Task
```
```
Task
DeleteObject
```
```
DeleteObject
(
```
##### (

```
IAmazonS
```
```
IAmazonS
client
```
```
client
,
```
##### ,

stringstring bucketNamebucketName,,

```
string
```
```
string
objectName
```
```
objectName
)
```
##### )


##### {

##### {

trytry

##### {

##### {

```
var
```
```
var
deleteRequest
```
```
deleteRequest
=
```
##### =

```
new
```
```
new
DeleteObjectRequest
```
```
DeleteObjectRequest
(
```
##### (

##### )

##### )

##### {{

```
BucketName
```
```
BucketName
=
```
##### =

```
bucketName
```
```
bucketName
,
```
##### ,

```
Key
```
```
Key
=
```
##### =

```
objectName
```
```
objectName
,
```
##### ,

##### }};;

```
await
```
```
await
client
```
```
client
.
```
##### .

```
DeleteObjectAsync
```
```
DeleteObjectAsync
(
```
##### (

```
deleteRequest
```
```
deleteRequest
)
```
##### )

##### ;

##### ;

```
Console
```
```
Console
.
```
##### .

```
WriteLine
```
```
WriteLine
(
```
##### (

```
"Delete object completed."
```
```
"Delete object completed."
)
```
##### )

##### ;

##### ;

##### }

##### }

```
catch
```
```
catch
(
```
##### (

```
AmazonS3Exception
```
```
AmazonS3Exception
e
```
```
e
)
```
##### )

##### {

##### {

ConsoleConsole..WriteLineWriteLine(($$"Error: {e.Message}""Error: {e.Message}"));;

##### }

##### }

##### }

##### }

##### }}

##### }

##### }


