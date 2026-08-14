// ─────────────────────────────────────────────────────────────────────────────
// AI Growth Center — tool catalog (config-driven).
//
// Every card on the AI Growth Center screen is described here. Adding a new AI
// tool = add one entry (endpoint + inputs + how to render the result). The
// screen, form, result renderer and copy/share serialiser are all generic and
// read from this config — nothing else needs to change.
//
// input.type:  'text' (default) | 'textarea' | 'toggle'
// render:      'sections' | 'keywords' | 'list' | 'faq' | 'checklist'
//
// section.apply: makes a generated block writable straight into the real field
//   it was written for, instead of leaving the customer to copy and paste it.
//   { to: 'gbp', field: '<editable GBP field>', label, confirm }
//   'gbp' fields must be one of FieldMap::editableFields() on the backend —
//   business_name, description, phone, website — or the write is rejected.
// ─────────────────────────────────────────────────────────────────────────────

export const AI_TOOLS = [
  {
    key: 'business-description',
    title: 'Business Description',
    icon: '📝',
    blurb: 'Google description, About Us & summaries',
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
        // The one field where generate → apply is a closed loop today: it is
        // editable on Google, and it is the single biggest scoring item.
        apply: {
          to: 'gbp',
          field: 'description',
          label: 'Apply to Google',
          confirm: 'This replaces the description on your live Google Business Profile. Continue?',
        },
      },
      { key: 'about_us', label: 'Website About Us' },
      { key: 'short_description', label: 'Short Description' },
      { key: 'professional_summary', label: 'Professional Summary' },
    ],
  },
  {
    key: 'keywords',
    title: 'SEO Keywords',
    icon: '🔍',
    blurb: 'Primary, local & voice-search keywords',
    endpoint: '/api/ai/keywords.php',
    inputs: [
      { name: 'business_name', label: 'Business Name', required: true, placeholder: 'e.g. Sharma Dental Care' },
      { name: 'category', label: 'Category', required: true, placeholder: 'e.g. Dental Clinic' },
      { name: 'city', label: 'City', placeholder: 'e.g. Nagpur' },
      { name: 'services', label: 'Services', type: 'textarea', placeholder: 'Root canal, braces, teeth whitening…' },
    ],
    render: 'keywords',
    groups: [
      { key: 'primary', label: 'Primary Keywords' },
      { key: 'secondary', label: 'Secondary Keywords' },
      { key: 'long_tail', label: 'Long Tail Keywords' },
      { key: 'local_seo', label: 'Local SEO Keywords' },
      { key: 'voice_search', label: 'Voice Search Keywords' },
    ],
  },
  {
    key: 'taglines',
    title: 'Taglines',
    icon: '💡',
    blurb: '10 professional taglines for your brand',
    endpoint: '/api/ai/taglines.php',
    inputs: [
      { name: 'business_name', label: 'Business Name', required: true, placeholder: 'e.g. Sharma Dental Care' },
      { name: 'category', label: 'Category', required: true, placeholder: 'e.g. Dental Clinic' },
      { name: 'city', label: 'City', placeholder: 'e.g. Nagpur' },
      { name: 'services', label: 'Services', type: 'textarea', placeholder: 'Root canal, braces, teeth whitening…' },
      { name: 'target_customers', label: 'Target Customers', type: 'textarea', placeholder: 'Families, working professionals…' },
    ],
    render: 'list',
    listKey: 'taglines',
  },
  {
    key: 'service-description',
    title: 'Service Descriptions',
    icon: '🛠',
    blurb: 'SEO title + short & long descriptions',
    endpoint: '/api/ai/service-description.php',
    inputs: [
      { name: 'service_name', label: 'Service Name', required: true, placeholder: 'e.g. Root Canal Treatment' },
      { name: 'business_name', label: 'Business Name', placeholder: 'e.g. Sharma Dental Care' },
      { name: 'category', label: 'Category', placeholder: 'e.g. Dental Clinic' },
      { name: 'city', label: 'City', placeholder: 'e.g. Nagpur' },
    ],
    render: 'sections',
    sections: [
      { key: 'title', label: 'Professional Title' },
      { key: 'seo_description', label: 'SEO Description' },
      { key: 'short_version', label: 'Short Version' },
      { key: 'long_version', label: 'Long Version' },
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
  {
    key: 'faq',
    title: 'FAQ Generator',
    icon: '❓',
    blurb: '10 FAQs with answers for your category',
    endpoint: '/api/ai/faq.php',
    inputs: [
      { name: 'business_name', label: 'Business Name', required: true, placeholder: 'e.g. Sharma Dental Care' },
      { name: 'category', label: 'Category', required: true, placeholder: 'e.g. Dental Clinic' },
      { name: 'city', label: 'City', placeholder: 'e.g. Nagpur' },
      { name: 'services', label: 'Services', type: 'textarea', placeholder: 'Root canal, braces, teeth whitening…' },
    ],
    render: 'faq',
    listKey: 'faqs',
  },
  {
    key: 'improvement-suggestions',
    title: 'Improvement Suggestions',
    icon: '📈',
    blurb: 'Actionable checklist to grow your profile',
    endpoint: '/api/ai/improvement-suggestions.php',
    inputs: [
      { name: 'business_name', label: 'Business Name', required: true, placeholder: 'e.g. Sharma Dental Care' },
      { name: 'category', label: 'Category', placeholder: 'e.g. Dental Clinic' },
      { name: 'city', label: 'City', placeholder: 'e.g. Nagpur' },
      { name: 'services', label: 'Services', type: 'textarea', placeholder: 'Root canal, braces, teeth whitening…' },
      { name: 'has_description', label: 'Has a business description', type: 'toggle' },
      { name: 'has_logo', label: 'Has a logo', type: 'toggle' },
      { name: 'has_cover_image', label: 'Has a cover image', type: 'toggle' },
      { name: 'has_contact', label: 'Has contact details', type: 'toggle' },
      { name: 'has_website', label: 'Has a website', type: 'toggle' },
      { name: 'has_business_hours', label: 'Has business hours', type: 'toggle' },
      { name: 'has_keywords', label: 'Has SEO keywords', type: 'toggle' },
    ],
    render: 'checklist',
  },
];

export const getAiTool = (key) => AI_TOOLS.find((t) => t.key === key) || null;
