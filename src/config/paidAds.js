import { Platform } from 'react-native';

/**
 * Is the points wallet / Boost Ads feature available on this platform?
 *
 * FALSE ON iOS, deliberately.
 *
 * Points are bought with money (a Razorpay top-up) and spent on Meta post
 * boosts. That is paid digital content consumed inside the app, so App Review
 * requires it to go through In-App Purchase — Apple rejected the app under
 * Guideline 3.1.1 for exactly this, having reached the Wallet through the
 * Boost Ads balance strip.
 *
 * The physical-goods exemption that legitimately covers Tapify's NFC cards does
 * NOT cover ad credits, so this cannot be argued; it has to be either IAP or
 * absent. Routing ad spend through IAP would hand Apple a commission on money
 * that is largely passed on to Meta, so on iOS the feature is hidden instead.
 *
 * Android is unaffected and keeps the full feature.
 *
 * To bring it to iOS later, implement StoreKit purchases for points and flip
 * this — do not simply flip it, or the next review will reject again.
 */
export const PAID_ADS_ENABLED = Platform.OS !== 'ios';

/** Screens that only exist when the paid-ads feature does. */
export const PAID_ADS_SCREENS = ['wallet', 'boost-ads', 'ad-insights'];
