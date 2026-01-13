# Service Tests - Conditions

This document lists the conditions evaluated by the unit tests for each service.

## authService
- login: sends POST to auth-login and returns token/refreshToken on success
- login: throws "Credenciales invalidas" on non-ok response
- loginWithGoogle: uses GoogleSignin and returns session tokens from Supabase
- refreshToken: reads refresh token, refreshes session, stores new tokens

## chatService
- getChatByMatchId: returns null on 404
- getMessages: maps messages and sets status for current user

## flatExpenseService
- getExpenses: returns expenses and members from payload
- createExpense: throws on non-ok response

## flatSettlementService
- getSettlement: returns data on ok response
- setTransferPaid: throws on non-ok response

## interestService
- getReceivedInterests: returns data on ok response
- getGivenInterests: throws on non-ok response

## locationService
- getCities: builds query for top cities
- getCityById: returns null when no data
- trackPlaceSearches: no request when place list is empty

## matchService
- getMatch: returns null on 404
- getMatch: throws on non-ok response
- getMatch: returns data on ok response

## notificationService
- initForegroundHandler: requests permission and creates channel
- initNotificationOpener: returns unsubscribe that calls both unsubscribers
- consumePendingChatNavigation: clears pending chat id key

## profilePhotoService
- getPhotos: returns list on ok response
- uploadPhoto: throws when auth token missing
- deletePhoto: throws on non-ok response

## profileService
- getProfile: returns null on 404
- getProfile: refreshes token and retries on 401
- createProfile: throws with api error message

## pushTokenService
- register: returns denied when permission not granted
- register: stores token on success
- unregister: removes cached token

## roomAssignmentService
- getAssignments: returns data on ok response
- createAssignment: throws on non-ok response

## roomExtrasService
- getExtras: returns null on empty data
- getExtrasForRooms: returns empty list when no room ids
- upsertExtras: throws on non-ok response

## roomInvitationService
- createInvitation: returns data on ok response
- createInvitation: throws when response has no data
- createInvitation: throws on non-ok response

## roomPhotoService
- uploadPhoto: throws when auth token missing
- uploadPhoto: returns payload on ok response
- uploadPhoto: throws on non-ok response

## roomService
- getRoomsByFlatIds: returns empty list when flatIds empty
- createRoom: throws on non-ok response
- searchRooms: returns paginated payload

## shareService
- getProfileShareImage: retries on 401 and returns arrayBuffer

## swipeRejectionService
- getRejections: maps api payload to app model
- getRejections: retries on 401
- createRejection: ignores conflict (409)
