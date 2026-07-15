using System.Text.Json.Serialization;

namespace Syncra.Application.DTOs.Zernio;

public sealed record ZernioCreatePostApiRequest(
    [property: JsonPropertyName("content")] string Content,
    [property: JsonPropertyName("platforms")] IReadOnlyList<ZernioCreatePostPlatformInnerDto> Platforms,
    [property: JsonPropertyName("title")] string? Title = null,
    [property: JsonPropertyName("scheduledFor")] DateTime? ScheduledFor = null,
    [property: JsonPropertyName("publishNow")] bool PublishNow = false,
    [property: JsonPropertyName("isDraft")] bool IsDraft = false,
    [property: JsonPropertyName("mediaItems")] IReadOnlyList<ZernioMediaItemRequestDto>? MediaItems = null,
    [property: JsonPropertyName("tiktokSettings")] TikTokSettingsDto? TiktokSettings = null,
    [property: JsonPropertyName("facebookSettings")] FacebookPlatformDataDto? FacebookSettings = null
);

public sealed record ZernioCreatePostPlatformInnerDto(
    [property: JsonPropertyName("platform")] string Platform,
    [property: JsonPropertyName("accountId")] string AccountId,
    [property: JsonPropertyName("customContent")] string? CustomContent = null,
    [property: JsonPropertyName("platformSpecificData")] object? PlatformSpecificData = null
);

public sealed record AllPlatformDataDto(
    [property: JsonPropertyName("twitter")] TwitterPlatformDataDto? Twitter = null,
    [property: JsonPropertyName("threads")] ThreadsPlatformDataDto? Threads = null,
    [property: JsonPropertyName("facebook")] FacebookPlatformDataDto? Facebook = null,
    [property: JsonPropertyName("instagram")] InstagramPlatformDataDto? Instagram = null,
    [property: JsonPropertyName("linkedin")] LinkedInPlatformDataDto? LinkedIn = null,
    [property: JsonPropertyName("pinterest")] PinterestPlatformDataDto? Pinterest = null,
    [property: JsonPropertyName("youtube")] YouTubePlatformDataDto? YouTube = null,
    [property: JsonPropertyName("googlebusiness")] GoogleBusinessPlatformDataDto? GoogleBusiness = null,
    [property: JsonPropertyName("tiktok")] TikTokSettingsDto? TikTok = null,
    [property: JsonPropertyName("telegram")] TelegramPlatformDataDto? Telegram = null,
    [property: JsonPropertyName("snapchat")] SnapchatPlatformDataDto? Snapchat = null,
    [property: JsonPropertyName("reddit")] RedditPlatformDataDto? Reddit = null,
    [property: JsonPropertyName("bluesky")] BlueskyPlatformDataDto? Bluesky = null,
    [property: JsonPropertyName("discord")] DiscordPlatformDataDto? Discord = null
);

public sealed record ZernioMediaItemRequestDto(
    [property: JsonPropertyName("url")] string Url,
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("filename")] string? Filename = null,
    [property: JsonPropertyName("mimeType")] string? MimeType = null
);

public sealed record ZernioGeoRestrictionDto(
    [property: JsonPropertyName("countries")] IReadOnlyList<string> Countries
);

public sealed record ZernioThreadItemDto(
    [property: JsonPropertyName("content")] string Content,
    [property: JsonPropertyName("mediaItems")] IReadOnlyList<object>? MediaItems = null
);

// 1. Twitter
public sealed record TwitterPlatformDataDto(
    [property: JsonPropertyName("replyToTweetId")] string? ReplyToTweetId = null,
    [property: JsonPropertyName("replySettings")] string? ReplySettings = null,
    [property: JsonPropertyName("threadItems")] IReadOnlyList<ZernioThreadItemDto>? ThreadItems = null,
    [property: JsonPropertyName("poll")] TwitterPollDto? Poll = null,
    [property: JsonPropertyName("longVideo")] bool? LongVideo = null,
    [property: JsonPropertyName("geoRestriction")] ZernioGeoRestrictionDto? GeoRestriction = null
);

public sealed record TwitterPollDto(
    [property: JsonPropertyName("options")] IReadOnlyList<string> Options,
    [property: JsonPropertyName("duration_minutes")] int DurationMinutes
);

// 2. TikTok (Requires snake_case exactly as documented!)
public sealed record TikTokSettingsDto(
    [property: JsonPropertyName("draft")] bool? Draft = null,
    [property: JsonPropertyName("privacy_level")] string? PrivacyLevel = null,
    [property: JsonPropertyName("allow_comment")] bool? AllowComment = null,
    [property: JsonPropertyName("allow_duet")] bool? AllowDuet = null,
    [property: JsonPropertyName("allow_stitch")] bool? AllowStitch = null,
    [property: JsonPropertyName("commercial_content_type")] string? CommercialContentType = null,
    [property: JsonPropertyName("brand_partner_promote")] bool? BrandPartnerPromote = null,
    [property: JsonPropertyName("is_brand_organic_post")] bool? IsBrandOrganicPost = null,
    [property: JsonPropertyName("content_preview_confirmed")] bool? ContentPreviewConfirmed = null,
    [property: JsonPropertyName("express_consent_given")] bool? ExpressConsentGiven = null,
    [property: JsonPropertyName("media_type")] string? MediaType = null,
    [property: JsonPropertyName("video_cover_timestamp_ms")] int? VideoCoverTimestampMs = null,
    [property: JsonPropertyName("video_cover_image_url")] string? VideoCoverImageUrl = null,
    [property: JsonPropertyName("photo_cover_index")] int? PhotoCoverIndex = null,
    [property: JsonPropertyName("auto_add_music")] bool? AutoAddMusic = null,
    [property: JsonPropertyName("video_made_with_ai")] bool? VideoMadeWithAi = null,
    [property: JsonPropertyName("description")] string? Description = null
);

// 3. Facebook
public sealed record FacebookPlatformDataDto(
    [property: JsonPropertyName("draft")] bool? Draft = null,
    [property: JsonPropertyName("contentType")] string? ContentType = null,
    [property: JsonPropertyName("title")] string? Title = null,
    [property: JsonPropertyName("firstComment")] string? FirstComment = null,
    [property: JsonPropertyName("pageId")] string? PageId = null,
    [property: JsonPropertyName("geoRestriction")] ZernioGeoRestrictionDto? GeoRestriction = null,
    [property: JsonPropertyName("carouselCards")] IReadOnlyList<FacebookCarouselCardDto>? CarouselCards = null,
    [property: JsonPropertyName("carouselLink")] string? CarouselLink = null
);

public sealed record FacebookCarouselCardDto(
    [property: JsonPropertyName("link")] string Link,
    [property: JsonPropertyName("name")] string? Name = null,
    [property: JsonPropertyName("description")] string? Description = null
);

// 4. Instagram
public sealed record InstagramPlatformDataDto(
    [property: JsonPropertyName("publishAs")] string? PublishAs = null,
    [property: JsonPropertyName("contentType")] string? ContentType = null,
    [property: JsonPropertyName("shareToFeed")] bool? ShareToFeed = null,
    [property: JsonPropertyName("collaborators")] IReadOnlyList<string>? Collaborators = null,
    [property: JsonPropertyName("firstComment")] string? FirstComment = null,
    [property: JsonPropertyName("locationId")] string? LocationId = null,
    [property: JsonPropertyName("altText")] string? AltText = null,
    [property: JsonPropertyName("trialParams")] InstagramTrialParamsDto? TrialParams = null,
    [property: JsonPropertyName("userTags")] IReadOnlyList<InstagramUserTagDto>? UserTags = null,
    [property: JsonPropertyName("audioName")] string? AudioName = null,
    [property: JsonPropertyName("thumbOffset")] int? ThumbOffset = null,
    [property: JsonPropertyName("instagramThumbnail")] string? InstagramThumbnail = null,
    [property: JsonPropertyName("reelCover")] string? ReelCover = null
);

public sealed record InstagramTrialParamsDto(
    [property: JsonPropertyName("graduationStrategy")] string? GraduationStrategy = null
);

public sealed record InstagramUserTagDto(
    [property: JsonPropertyName("username")] string Username,
    [property: JsonPropertyName("x")] double X,
    [property: JsonPropertyName("y")] double Y,
    [property: JsonPropertyName("mediaIndex")] int? MediaIndex = null
);

// 5. LinkedIn
public sealed record LinkedInPlatformDataDto(
    [property: JsonPropertyName("documentTitle")] string? DocumentTitle = null,
    [property: JsonPropertyName("organizationUrn")] string? OrganizationUrn = null,
    [property: JsonPropertyName("firstComment")] string? FirstComment = null,
    [property: JsonPropertyName("disableLinkPreview")] bool? DisableLinkPreview = null,
    [property: JsonPropertyName("geoRestriction")] ZernioGeoRestrictionDto? GeoRestriction = null
);

// 6. Pinterest
public sealed record PinterestPlatformDataDto(
    [property: JsonPropertyName("title")] string? Title = null,
    [property: JsonPropertyName("boardId")] string? BoardId = null,
    [property: JsonPropertyName("link")] string? Link = null,
    [property: JsonPropertyName("coverImageUrl")] string? CoverImageUrl = null,
    [property: JsonPropertyName("coverImageKeyFrameTime")] int? CoverImageKeyFrameTime = null
);

// 7. YouTube
public sealed record YouTubePlatformDataDto(
    [property: JsonPropertyName("title")] string? Title = null,
    [property: JsonPropertyName("visibility")] string? Visibility = null,
    [property: JsonPropertyName("madeForKids")] bool? MadeForKids = null,
    [property: JsonPropertyName("firstComment")] string? FirstComment = null,
    [property: JsonPropertyName("containsSyntheticMedia")] bool? ContainsSyntheticMedia = null,
    [property: JsonPropertyName("categoryId")] string? CategoryId = null,
    [property: JsonPropertyName("playlistId")] string? PlaylistId = null
);

// 8. Google Business
public sealed record GoogleBusinessPlatformDataDto(
    [property: JsonPropertyName("locationId")] string? LocationId = null,
    [property: JsonPropertyName("languageCode")] string? LanguageCode = null,
    [property: JsonPropertyName("topicType")] string? TopicType = null,
    [property: JsonPropertyName("callToAction")] GbpCallToActionDto? CallToAction = null,
    [property: JsonPropertyName("event")] GbpEventDto? Event = null,
    [property: JsonPropertyName("offer")] GbpOfferDto? Offer = null
);

public sealed record GbpCallToActionDto(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("url")] string Url
);

public sealed record GbpEventDto(
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("schedule")] GbpScheduleDto Schedule
);

public sealed record GbpScheduleDto(
    [property: JsonPropertyName("startDate")] GbpDateDto StartDate,
    [property: JsonPropertyName("endDate")] GbpDateDto EndDate,
    [property: JsonPropertyName("startTime")] GbpTimeDto? StartTime = null,
    [property: JsonPropertyName("endTime")] GbpTimeDto? EndTime = null
);

public sealed record GbpDateDto(
    [property: JsonPropertyName("year")] int Year,
    [property: JsonPropertyName("month")] int Month,
    [property: JsonPropertyName("day")] int Day
);

public sealed record GbpTimeDto(
    [property: JsonPropertyName("hours")] int Hours,
    [property: JsonPropertyName("minutes")] int Minutes
);

public sealed record GbpOfferDto(
    [property: JsonPropertyName("offerType")] string? OfferType = null,
    [property: JsonPropertyName("redeemOnlineUrl")] string? RedeemOnlineUrl = null,
    [property: JsonPropertyName("termsConditions")] string? TermsConditions = null,
    [property: JsonPropertyName("couponCode")] string? CouponCode = null
);

// 9. Threads
public sealed record ThreadsPlatformDataDto(
    [property: JsonPropertyName("topic_tag")] string? TopicTag = null,
    [property: JsonPropertyName("threadItems")] IReadOnlyList<ZernioThreadItemDto>? ThreadItems = null
);

// 10. Telegram
public sealed record TelegramPlatformDataDto(
    [property: JsonPropertyName("parseMode")] string? ParseMode = null,
    [property: JsonPropertyName("disableWebPagePreview")] bool? DisableWebPagePreview = null,
    [property: JsonPropertyName("disableNotification")] bool? DisableNotification = null,
    [property: JsonPropertyName("protectContent")] bool? ProtectContent = null
);

// 11. Snapchat
public sealed record SnapchatPlatformDataDto(
    [property: JsonPropertyName("contentType")] string? ContentType = null
);

// 12. Reddit
public sealed record RedditPlatformDataDto(
    [property: JsonPropertyName("subreddit")] string? Subreddit = null,
    [property: JsonPropertyName("title")] string? Title = null,
    [property: JsonPropertyName("url")] string? Url = null,
    [property: JsonPropertyName("forceSelf")] bool? ForceSelf = null,
    [property: JsonPropertyName("flairId")] string? FlairId = null,
    [property: JsonPropertyName("nativeVideo")] bool? NativeVideo = null,
    [property: JsonPropertyName("videogif")] bool? Videogif = null,
    [property: JsonPropertyName("videoPosterUrl")] string? VideoPosterUrl = null
);

// 13. Bluesky
public sealed record BlueskyPlatformDataDto(
    [property: JsonPropertyName("threadItems")] IReadOnlyList<ZernioThreadItemDto>? ThreadItems = null
);

// 14. Discord
public sealed record DiscordPlatformDataDto(
    [property: JsonPropertyName("channelId")] string ChannelId,
    [property: JsonPropertyName("embeds")] IReadOnlyList<DiscordEmbedDto>? Embeds = null,
    [property: JsonPropertyName("poll")] DiscordPollDto? Poll = null,
    [property: JsonPropertyName("crosspost")] bool? Crosspost = null,
    [property: JsonPropertyName("forumThreadName")] string? ForumThreadName = null,
    [property: JsonPropertyName("forumAppliedTags")] IReadOnlyList<string>? ForumAppliedTags = null,
    [property: JsonPropertyName("threadFromMessage")] DiscordThreadFromMessageDto? ThreadFromMessage = null,
    [property: JsonPropertyName("tts")] bool? Tts = null,
    [property: JsonPropertyName("webhookUsername")] string? WebhookUsername = null,
    [property: JsonPropertyName("webhookAvatarUrl")] string? WebhookAvatarUrl = null
);

public sealed record DiscordEmbedDto(
    [property: JsonPropertyName("title")] string? Title = null,
    [property: JsonPropertyName("description")] string? Description = null,
    [property: JsonPropertyName("url")] string? Url = null,
    [property: JsonPropertyName("color")] int? Color = null,
    [property: JsonPropertyName("image")] DiscordEmbedImageDto? Image = null,
    [property: JsonPropertyName("thumbnail")] DiscordEmbedImageDto? Thumbnail = null,
    [property: JsonPropertyName("footer")] DiscordEmbedFooterDto? Footer = null,
    [property: JsonPropertyName("author")] DiscordEmbedAuthorDto? Author = null,
    [property: JsonPropertyName("fields")] IReadOnlyList<DiscordEmbedFieldDto>? Fields = null
);

public sealed record DiscordEmbedImageDto(
    [property: JsonPropertyName("url")] string Url
);

public sealed record DiscordEmbedFooterDto(
    [property: JsonPropertyName("text")] string Text,
    [property: JsonPropertyName("icon_url")] string? IconUrl = null
);

public sealed record DiscordEmbedAuthorDto(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("url")] string? Url = null,
    [property: JsonPropertyName("icon_url")] string? IconUrl = null
);

public sealed record DiscordEmbedFieldDto(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("value")] string Value,
    [property: JsonPropertyName("inline")] bool? Inline = null
);

public sealed record DiscordPollDto(
    [property: JsonPropertyName("question")] DiscordPollQuestionDto Question,
    [property: JsonPropertyName("answers")] IReadOnlyList<DiscordPollAnswerDto> Answers,
    [property: JsonPropertyName("duration")] int? Duration = null,
    [property: JsonPropertyName("allow_multiselect")] bool? AllowMultiselect = null
);

public sealed record DiscordPollQuestionDto(
    [property: JsonPropertyName("text")] string Text
);

public sealed record DiscordPollAnswerDto(
    [property: JsonPropertyName("poll_media")] DiscordPollQuestionDto PollMedia
);

public sealed record DiscordThreadFromMessageDto(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("autoArchiveDuration")] int? AutoArchiveDuration = null,
    [property: JsonPropertyName("rateLimitPerUser")] int? RateLimitPerUser = null
);
