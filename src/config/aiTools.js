// ─────────────────────────────────────────────────────────────────────────────
// AI Growth Center — tool catalog (config-driven).
//
// Every card on the AI Growth Center screen is described here. Adding a new AI
// tool = add one entry (endpoint + inputs + how to render the result). The
// screen, form, result renderer and copy/share serialiser are all generic and
// read from this config — nothing else needs to change.
//
// input.type:  'text' (default) | 'textarea' | 'toggle'
// render:      'sections' | 'keywords' | 'list' | 'faq'
//
// section.apply: makes a generated block writable straight into the real field
//   it was written for, instead of leaving the customer to copy and paste it.
//   { to: 'gbp', field: '<editable GBP field>', label, confirm }
//   'gbp' fields must be one of FieldMap::editableFields() on the backend —
//   business_name, description, phone, website — or the write is rejected.
//
// ── WHAT BELONGS HERE ────────────────────────────────────────────────────────
// Only tools whose output ends up somewhere real. Every card must finish in a
// change to the live Google listing, either through an `apply` target or, for
// review replies, by being posted from the Google Reviews screen.
//
// Removed for failing that test, in order:
//   improvement-suggestions — asked the customer to self-report seven yes/no
//     facts the profile score now reads off the live listing, and the answers
//     were often wrong, so the AI advised against a fiction.
//   keywords, taglines, service-description, faq — Google has no field for any
//     of them, so the output could only ever be copied out of the app and
//     pasted somewhere we don't control.
//
// Their endpoints (api/ai/keywords.php, taglines.php, service-description.php,
// faq.php, improvement-suggestions.php) are left on the server, unused, so past
// history rows stay readable and re-adding a card is a config change. Do not add
// a card back without an apply target — that is the whole rule.
// ─────────────────────────────────────────────────────────────────────────────
export const AI_TOOLS = [
  {
    key: 'business-description',
    title: 'Business Description',
    icon: '📝',
    blurb: 'Write your Google Business description',
    endpoint: '/api/ai/business-description.php',
    inputs: [
      { name: 'business_name', label: 'Business Name', required: true, placeholder: 'e.g. Sharma Dental Care' },
      { name: 'category', label: 'Category', required: true, placeholder: 'e.g. Dental Clinic' },
      { name: 'city', label: 'City', placeholder: 'e.g. Nagpur' },
      { name: 'services', label: 'Services', type: 'textarea', placeholder: 'Root canal, braces, teeth whitening…' },
      { name: 'target_customers', label: 'Target Customers', type: 'textarea', placeholder: 'Families, working professionals…' },
    ],
    render: 'sections',
    sections: [
      {
        key: 'google_description',
        label: 'Google Business Description',
        // The one field where generate → apply is a closed loop: it is editable
        // on Google, and it is the single biggest scoring item.
        apply: {
          to: 'gbp',
          field: 'description',
          label: 'Apply to Google',
          confirm: 'This replaces the description on your live Google Business Profile. Continue?',
        },
      },
    ],
  },
  {
    key: 'review-reply',
    title: 'Review Replies',
    icon: '⭐',
    blurb: 'Reply to a customer review, 4 tones',
    endpoint: '/api/ai/review-reply.php',
    inputs: [
      { name: 'review', label: 'Customer Review', required: true, type: 'textarea', placeholder: 'Paste the customer review here…' },
      { name: 'business_name', label: 'Business Name', placeholder: 'e.g. Sharma Dental Care' },
    ],
    render: 'sections',
    sections: [
      { key: 'professional', label: 'Professional' },
      { key: 'friendly', label: 'Friendly' },
      { key: 'formal', label: 'Formal' },
      { key: 'short', label: 'Short' },
    ],
  },
];

export const getAiTool = (key) => AI_TOOLS.find((t) => t.key === key) || null;
