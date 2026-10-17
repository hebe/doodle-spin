// Wraps drawing markup in the shared doodle frame: 3px round ink lines, no fill unless a class sets one.
// Classes: .a accent fill, .p paper fill, .k ink fill.
export const S = body => '<svg viewBox="6 6 92 92" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
