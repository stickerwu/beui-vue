/**
 * English defaults for the block components in this folder. Each component
 * accepts `labels?: Partial<...>` to override any string, mirroring the
 * `<name>Messages` exports of the React originals (which these replace, since a
 * `.vue` module cannot export a constant from its `<script setup>`).
 */

export const morphingTabsMessages = {
  label: 'Tabs',
  close: 'Close {label}',
}

export const expandableTabsMessages = {
  label: 'Navigation tabs',
}

export const morphingSearchChipsMessages = {
  placeholder: 'Search',
  label: 'Search',
  suggestions: 'Suggestions',
  recent: 'Recent',
  recentSearches: 'Recent searches',
  clear: 'Clear',
  searching: 'Searching…',
  removeFilter: 'Remove filter {term}',
  hint: 'Enter adds a filter. Backspace at the start of the field selects the last filter, and again removes it. Delete removes the highlighted recent search.',
  filterLimit: 'Up to {max} filters',
  filterAdded: 'Added filter {term}',
  filterRemoved: 'Removed filter {term}',
  recentRemoved: 'Removed {term} from recent searches',
  recentsCleared: 'Cleared recent searches',
  filterMarked: '{term} selected. Press Backspace again to remove it.',
}

export const swipeableListMessages = {
  actionsFor: 'Actions for {title}',
  showActions: 'Show actions',
}

export const bloomMenuMessages = {
  create: 'Create',
  close: 'Close menu',
  doc: 'Doc',
  board: 'Board',
  table: 'Table',
  folder: 'Folder',
  reminder: 'Reminder',
  link: 'Link',
}

export const notificationStackMessages = {
  collapsedLabel: 'Notifications',
  expandedLabel: 'View all',
  emptyLabel: 'All caught up',
  collapsedAria: 'Notifications: {count}. Expand notifications.',
  expandedAria: 'Notifications: {count}. {label}.',
}

export const infiniteMasonryMessages = {
  label: 'Infinite masonry feed',
  emptyTitle: 'No items yet',
  emptyDescription: 'New items will appear here when they become available.',
  loadError: "Couldn't load more",
  retry: 'Try again',
  loadingMore: 'Loading more items',
  loadMore: 'Load more',
  endOfResults: 'End of results',
}

/** `components/motion/card-dealer.tsx` — the card table. */
export const cardDealerMessages = {
  label: 'Card table',
}

/** `components/motion/file-upload.tsx` — the progress queue. */
export const fileUploadMessages = {
  title: 'Drop files here',
  description: 'Add files to the upload queue',
  browse: 'Browse',
  input: 'Upload files',
  limitTitle: 'Upload limit reached',
  limitDescription: '{count} of {max} files added',
  queued: 'Queued',
  uploading: 'Uploading',
  success: 'Uploaded',
  error: 'Failed',
  retry: 'Retry {name}',
  remove: 'Remove {name}',
  progress: '{name} upload progress',
}

/** `components/motion/attachment-upload.tsx` — the mixed attachment workspace. */
export const attachmentUploadMessages = {
  title: 'Drag and drop or browse files',
  description: 'Maximum {size} file size',
  attachments: 'Attachments',
  input: 'Upload attachments',
  limitTitle: 'Attachment limit reached',
  limitDescription: '{count} of {max} attachments added',
  uploading: 'Uploading {name}',
  uploadComplete: 'Upload complete',
  uploadCompleteFor: 'Upload complete for {name}',
  removingAttachment: 'Removing attachment',
  removing: 'Removing {name}',
  uploadFailed: 'Upload failed',
  uploadFailedFor: 'Upload failed for {name}',
  retryUpload: 'Retry upload',
  retry: 'Retry {name}',
  removeAttachment: 'Remove attachment',
  remove: 'Remove {name}',
  clickToPreview: 'Click to preview',
  preview: 'Preview {name}',
  previewOf: 'Preview of {name}',
  closePreview: 'Close image preview',
  play: 'Play {name}',
  pause: 'Pause {name}',
  open: 'Open {name}',
  web: 'Web',
}

export type MorphingTabsMessages = typeof morphingTabsMessages
export type ExpandableTabsMessages = typeof expandableTabsMessages
export type MorphingSearchChipsMessages = typeof morphingSearchChipsMessages
export type SwipeableListMessages = typeof swipeableListMessages
export type BloomMenuMessages = typeof bloomMenuMessages
export type InfiniteMasonryMessages = typeof infiniteMasonryMessages
export type NotificationStackMessages = typeof notificationStackMessages
export type CardDealerMessages = typeof cardDealerMessages
export type FileUploadMessages = typeof fileUploadMessages
export type AttachmentUploadMessages = typeof attachmentUploadMessages

/** `components/motion/not-found/shared.tsx` — strings shared by every not-found variant. */
export const notFoundMessages = {
  title: 'Page not found',
  description: 'The page you are looking for moved, vanished, or never existed.',
  homeLabel: 'Back home',
  browseLabel: 'Browse components',
  stackedCaption: 'out of the deck',
  terminalError: 'cd: no such file or directory: /page',
}
export type NotFoundMessages = typeof notFoundMessages

/** `components/motion/prediction-market-card.tsx` — strings of the market listing card. */
export const predictionMarketCardMessages = {
  payoutHint: 'Potential payout per $1 if this outcome wins, including your stake. Before fees; based on the displayed price.',
  payoutFor: 'Potential payout for {outcome}',
  volume: '{volume} vol.',
  bookmark: 'Bookmark {title}',
  trade: 'Trade {outcome} at {percent}%',
  percent: '{percent}%',
  yes: 'Yes',
  no: 'No',
}
export type PredictionMarketCardMessages = typeof predictionMarketCardMessages

/** `components/motion/prediction-market.tsx` — strings of the trade ticket. */
export const predictionMarketMessages = {
  buy: 'Buy',
  sell: 'Sell',
  orderType: 'Market',
  amount: 'Amount',
  shares: 'Shares',
  max: 'Max',
  toWin: 'To win',
  toReceive: 'To receive',
  avgPrice: 'Avg. Price {price}',
  trade: 'Trade',
  trading: 'Trading',
  tradeFilled: 'Trade filled',
  connect: 'Connect',
  enterAmount: 'Enter an amount',
  minimum: 'Minimum {amount}',
  insufficientBalance: 'Insufficient balance',
  notEnoughShares: 'Not enough shares',
}
export type PredictionMarketMessages = typeof predictionMarketMessages

/** `components/motion/wallet-card/messages.ts` — strings of the wallet overview card. */
export const walletCardMessages = {
  notifications: 'Notifications',
  balance: 'Balance',
  showBalance: 'Show balance',
  hideBalance: 'Hide balance',
  search: 'Search',
  searchPlaceholder: 'Search',
  noMatches: 'No matches',
  noRecent: 'No recent searches',
  selectAccount: 'Select account',
  send: 'Send',
  deposit: 'Deposit',
  swap: 'Swap',
  buy: 'Buy',
  copied: 'Copied',
  copyAddress: 'Copy address',
}
export type WalletCardMessages = typeof walletCardMessages

/** `components/motion/otp-input.tsx` — strings of the passcode input. */
export const otpInputMessages = {
  label: 'One-time passcode',
  progress: '{entered} of {total} digits entered.',
  entered: '{digit}. {progress}',
  maskedDigit: 'Digit',
  deleted: 'Deleted. {progress}',
  position: '{slot}, digit {position} of {total}.',
  filled: 'Filled',
  empty: 'Empty',
  verified: 'Verified',
}
export type OTPInputMessages = typeof otpInputMessages

/** `components/motion/signup-form.tsx` — strings of the registration form. */
export const signUpFormMessages = {
  title: 'Create your account',
  description: 'Start building in under a minute.',
  submit: 'Create account',
  submitting: 'Creating account',
  submitted: 'Account created',
  retry: 'Try again',
  nameLabel: 'Name',
  namePlaceholder: 'Ada Lovelace',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'At least {count} characters',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  confirmPasswordLabel: 'Confirm password',
  confirmPasswordPlaceholder: 'Re-enter your password',
  terms: 'I agree to the Terms and Privacy Policy',
  strength: 'Password strength: {level}',
  strengthTooShort: 'Too short',
  strengthWeak: 'Weak',
  strengthFair: 'Fair',
  strengthGood: 'Good',
  strengthStrong: 'Strong',
  nameRequired: 'Enter your name.',
  emailRequired: 'Enter your email.',
  emailInvalid: "That doesn't look like an email address.",
  passwordRequired: 'Choose a password.',
  passwordTooShort: 'Use at least {count} characters.',
  confirmPasswordRequired: 'Confirm your password.',
  passwordMismatch: "Passwords don't match.",
  termsRequired: 'Accept the terms to continue.',
}
export type SignUpFormMessages = typeof signUpFormMessages

/** Fill `{name}` placeholders with the values given. */
export function formatMessage(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}

/** `components/motion/project-folder.tsx`. */
export const projectFolderMessages = {
  description: 'Updated recently',
  countOne: '{count} file',
  countOther: '{count} files',
  closeOverlay: 'Close file overlay',
  close: 'Close {title}',
}
export type ProjectFolderMessages = typeof projectFolderMessages

/** `components/motion/card-folder.tsx`. */
export const cardFolderMessages = {
  open: 'Open {title}, card ending in {lastFour}, expires {expiry}',
  close: 'Close {title}, card ending in {lastFour}, expires {expiry}',
  showDetails: 'Show card details',
  hideDetails: 'Hide card details',
  expiry: 'Expiry',
  cvv: 'CVV',
  actions: 'Open actions for {title}',
}
export type CardFolderMessages = typeof cardFolderMessages

/** `components/motion/swap/messages.ts`. */
export const swapMessages = {
  title: 'Swap',
  settings: 'Settings',
  reverse: 'Reverse direction',
  enterAmount: 'Enter an amount',
  insufficient: 'Insufficient {symbol}',
  swapAndSend: 'Swap + Send to {address}',
  swapTokens: 'Swap {from} → {to}',
  sendToOther: 'Send to different address',
  sendTo: 'To: {address}',
  addressPlaceholder: '0x... or name.eth',
  clearAddress: 'Clear address',
  close: 'Close',
  selectFromToken: 'Select from token',
  selectToToken: 'Select to token',
  searchPlaceholder: 'Search name or paste address',
  allChains: 'All',
  popular: 'Most popular',
  results: 'Results',
  trending: 'Trending',
  tokens: 'Tokens',
  empty: 'No tokens found',
  youPay: 'You pay',
  youGet: 'You get',
  rate: 'Rate',
  networkFee: 'Network fee',
  slippage: 'Slippage',
  eta: 'ETA',
  max: 'Max',
}
export type SwapMessages = typeof swapMessages

/** `components/motion/command-palette.tsx`. */
export const commandPaletteMessages = {
  placeholder: 'Type a command or search…',
  empty: 'No results found.',
  close: 'Close command palette',
  dialog: 'Command palette',
  list: 'Commands',
  results: 'Results',
}
export type CommandPaletteMessages = typeof commandPaletteMessages

/** `components/motion/overflow-actions.tsx`. */
export const overflowActionsMessages = {
  open: 'Show extra actions',
  close: 'Hide extra actions',
}
export type OverflowActionsMessages = typeof overflowActionsMessages

/** `components/motion/morphing-search.tsx`. */
export const morphingSearchMessages = {
  placeholder: 'Search',
  empty: 'No results found.',
  close: 'Close search',
  dialog: 'Search',
  results: 'Search results',
}
export type MorphingSearchMessages = typeof morphingSearchMessages

/** `components/motion/availability-scheduler/messages.ts`. `{day}` is the weekday name. */
export const availabilitySchedulerMessages = {
  toggleDay: 'Toggle {day} availability',
  unavailable: 'Unavailable',
  addTime: 'Add time',
  addRange: 'Add time range to {day}',
  remove: 'Remove',
  removeRange: 'Remove time range',
  copyTimes: 'Copy times',
  copyDay: 'Copy {day} hours to other days',
  copyTo: 'Copy times to',
  everyDay: 'Every day',
  apply: 'Apply',
}
export type AvailabilitySchedulerMessages = typeof availabilitySchedulerMessages

/** `components/motion/feedback-widget.tsx`. */
export const feedbackWidgetMessages = {
  title: 'Help us improve',
  placeholder: 'Share an idea or report a bug',
  close: 'Close',
  cancel: 'Cancel',
  submit: 'Submit',
  sending: 'Sending',
  sentTitle: 'Thanks!',
  sentDescription: 'Your feedback helps us build something better.',
  errorTitle: 'Something went wrong',
  errorDescription: "We couldn't send your feedback. Please try again.",
  retry: 'Try again',
}
export type FeedbackWidgetMessages = typeof feedbackWidgetMessages
