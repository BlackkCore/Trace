// ══════════════════════════════════════════════════════════
// INTERNATIONALIZATION (i18n) — Persian / English
// ══════════════════════════════════════════════════════════

var _currentLang = 'en';

var _translations = {
  en: {
    // Header
    header_tag: '⬡ PROXY CONFIGURATION SUITE',
    header_sub: 'Generate · Parse · Manage · Profile VLESS configurations',
    header_creator: 'Created by <a href="https://t.me/Blackkcore" target="_blank" rel="noopener">@Blackkcore</a> · All rights reserved',

    // Nav tabs
    tab_generate: '⚡ Generate',
    tab_profiles: '📁 Profiles',
    tab_bulk: '📥 Bulk',
    tab_tools: '🔧 Tools',
    tab_saved: '🗄 Saved Data',

    // Mode toggle
    mode_simple: '⚡ Simple Mode',
    mode_advanced: '⚙ Advanced Mode',

    // Simple mode
    simple_notice: '💡 Paste any <code>vless://</code> link to auto-load settings. Add multiple IPs or SNIs (one per line) to batch-generate. Press <code>Ctrl+Enter</code> to generate instantly.',
    simple_paste_title: 'Paste your VLESS link',
    simple_edit_title: 'Edit settings',

    // Labels
    label_uuid: 'UUID',
    label_port: 'Port',
    label_ips: 'IPs / Hosts — one per line',
    label_ips_hint: 'supports ranges: 1.2.3.1-50 · 1.2.3.0/24',
    label_sni: 'SNI — one per line (leave blank to skip)',
    label_sni_short: 'SNI',
    label_pair_mode: 'Pair Mode',
    label_host: 'Host header',
    label_path: 'Path',
    label_security: 'Security',
    label_fingerprint: 'Fingerprint',
    label_alpn: 'ALPN',
    label_remark_tpl: 'Remark Template',
    label_prefix: 'Prefix value',
    label_xhttp_mode: 'xhttp Mode',
    label_extra_json: 'Extra JSON',
    label_grpc_service: 'gRPC service name',
    label_allow_insecure: 'Allow Insecure',
    label_output: 'Output',
    label_input: 'Input',
    label_type: 'Type',
    label_encryption: 'Encryption',
    label_encryption_hint: 'Usually none',
    label_timeout_ms: 'Timeout (ms)',
    label_repeat: 'Repeat',
    label_label: 'Label',
    label_nickname: 'Nickname',
    label_ips_hosts: 'IPs / Hosts',
    label_ips_hosts_desc: 'One per line',
    label_ranges_cidr: 'supports ranges & CIDR',
    label_ips_hosts_one_per_line: 'IPs / Hosts (one per line)',
    label_snis_one_per_line: 'SNIs (one per line)',

    // Pair mode hints
    pair_mode_off: 'OFF — every IP × every SNI (full matrix)',
    pair_mode_off_adv: 'OFF — full IP × SNI matrix',
    pair_mode_on: 'ON — IP[1]↔SNI[1], IP[2]↔SNI[2], … (same index paired)',

    // Hints
    remark_vars_hint: 'Vars: {prefix} {ip} {sni} {port} {idx}',
    prefix_hint: 'Fills {prefix} in template above',
    sni_desc: 'One per line — multiplied with IPs',

    // Buttons
    btn_autodetect: '▶ Auto-detect & Load',
    btn_clear: '✕ Clear',
    btn_clear_all: '✕ Clear All',
    btn_generate: '⚡ Generate',
    btn_copy: '⎘ Copy',
    btn_copy_output: '⎘ Copy Output',
    btn_dl_txt: '↓ TXT',
    btn_dl_b64: '↓ Base64',
    btn_qr: '⬛ QR',
    btn_save_profile: '💾 Save Profile',
    btn_prev: '‹ Prev',
    btn_next: 'Next ›',
    btn_expand: '⤢ Expand',
    btn_save_ips: '★ Save',
    btn_load_ips: '★ Load',
    btn_save_snis: '★ Save SNIs',
    btn_load_snis: '★ Load SNIs',
    btn_parse: '▶ Parse & Preview',
    btn_apply_to_generator: 'Apply to Generator',
    btn_dismiss: 'Dismiss',
    btn_export: '↓ Export',
    btn_export_all: '↓ Export All',
    btn_import: '↑ Import',
    btn_dl_json: '↓ JSON',
    btn_dl_clash: '↓ Clash',
    btn_dl_singbox: '↓ Sing-box',
    btn_shuffle: '⇌ Shuffle',
    btn_validate: '🔍 Validate',
    btn_validate_ping: '🔍 + TCPing',
    btn_compare: '🔍 Compare',
    btn_encode: '→ Encode to Base64',
    btn_decode: '← Decode from Base64',
    btn_rename: '✏ Rename',
    btn_download: '↓ Download',
    btn_tcping_all: '⚡ TCPing All',
    btn_tcping_configs: '⚡ TCPing Configs',
    btn_export_fastest: '↓ Export fastest',
    btn_load_from_adv: '📋 Load from Advanced Output',
    btn_load_from_bulk: '📋 Load from Bulk',
    btn_decode_move: '↓ Decode & Move to Links',
    btn_fetch_decode: '🌐 Fetch & Decode',
    btn_dedup_all: '▶ Deduplicate All',
    btn_gen_add_uuid: '↻ Generate & Add',
    btn_add_custom_uuid: '+ Custom UUID',
    btn_add: '+ Add',
    btn_save: '+ Save',
    btn_add_new: '✎ Add New',
    btn_cancel: '✕ Cancel',
    btn_pick_saved: 'Pick saved',

    // Stats
    stat_links: 'Links',
    stat_ips: 'IPs',
    stat_snis: 'SNIs',
    stat_total: 'Total',
    stat_unique: 'Unique',
    stat_removed: 'Removed',

    // Output empty states
    output_empty: 'Your generated links will appear here.',
    adv_output_empty: 'Nothing generated yet.',

    // Advanced tabs
    adv_tab_generate: 'Generate',
    adv_tab_import: 'Import / Parse',
    adv_tab_history: 'History',
    adv_core_title: 'Core',
    adv_ips_snis_title: 'IPs & SNIs',
    adv_tls_title: 'TLS',
    adv_transport_title: 'Transport',
    adv_paste_uri_title: 'Paste vless:// URI',
    adv_parsed_fields_title: 'Parsed fields',
    adv_history_title: 'Session History',

    // Sort options
    sort_default: '— Sort —',
    sort_asc: 'A→Z (remark)',
    sort_desc: 'Z→A (remark)',
    sort_ip: 'By IP',
    sort_by_rtt: 'Sort by RTT',

    // Profiles
    profiles_title: 'Saved Profiles',
    profiles_notice: '💡 Save your generator settings as named profiles and reload them instantly.',

    // Bulk
    bulk_title: 'Bulk Import & Deduplicate',
    bulk_notice: '💡 Supports <strong>three input types</strong> — paste any combination and hit Deduplicate:<br>&nbsp;• Raw <code>vless://</code> links (one per line)<br>&nbsp;• Base64-encoded subscription string<br>&nbsp;• Subscription URL (fetched and decoded automatically)',
    bulk_tab_links: '📋 vless:// Links',
    bulk_tab_b64: '🔐 Base64 / Sub String',
    bulk_tab_url: '🌐 Subscription URL',
    bulk_links_label: 'Paste vless:// links (one per line)',
    bulk_b64_label: 'Paste base64 subscription content',
    bulk_url_label: 'Subscription URL',
    bulk_output_label: 'Deduplicated Output',
    strict_dedup_label: 'Strict dedup',

    // Tools
    tools_balancer_title: '⚖ Config Balancer — Generate v2rayNG / sing-box JSON',
    tools_balancer_notice: 'Paste any text containing vless:// links. Generates a ready-to-use JSON config with auto load-balancing for v2rayNG (Xray) or sing-box 1.13+.',
    tools_balancer_input_label: 'Input Links',
    tools_balancer_nodes_label: 'Parsed Nodes',
    tools_balancer_format_label: 'Output Format',
    tools_balancer_xray: 'Xray (v2rayNG)',
    tools_balancer_singbox: 'sing-box 1.13+',
    tools_balancer_strategy_label: 'Balancer Strategy',
    tools_balancer_least_ping: '🚀 Least Ping (Recommended)',
    tools_balancer_random: '🎲 Random / Selector',
    tools_balancer_probe_url_label: 'Probe URL',
    tools_balancer_probe_interval_label: 'Probe Interval',
    tools_balancer_socks_port_label: 'Local SOCKS Port',
    tools_balancer_generate: '⚡ Generate Config',
    tools_balancer_download: '↓ Download JSON',
    tools_balancer_output_label: 'Generated JSON',
    tools_validator_title: '⚡ Config Validator — Check a link',
    tools_validator_notice: 'Paste a vless:// link and get an instant health check — UUID format, port range, required fields, TLS params, and a TCPing to verify the server is reachable.',
    tools_validator_label: 'vless:// link to validate',
    tools_diff_title: 'Config Diff — Compare two links',
    tools_diff_link_a: 'Link A',
    tools_diff_link_b: 'Link B',
    tools_diff_differences: 'Differences',
    tools_b64_title: 'Base64 Encoder / Decoder',
    tools_renamer_title: 'Bulk Remark Renamer',
    tools_renamer_notice: 'Paste links and apply a new remark template to all of them.',
    tools_renamer_links_label: 'Links (one per line)',
    tools_tcping_title: 'TCPing — Check if IPs / hosts are reachable',
    tools_tcping_notice: 'Measures raw TCP SYN-ACK round-trip time to host:port — same method as v2rayN Ctrl+O. Tests network reachability, not proxy functionality.',
    tools_tcping_hosts_label: 'IPs / Hosts to test (one per line)',
    tools_cfg_tcping_title: 'Config TCPing — Test vless:// configs',
    tools_cfg_tcping_notice: 'Paste vless:// links and TCPing each config\'s server:port. Shows RTT per config with remark name — like v2rayN\'s per-server TCPing test (Ctrl+O).',
    tools_cfg_tcping_label: 'vless:// links (one per line)',

    // Saved data
    saved_tab_uuids: '🔑 UUIDs',
    saved_tab_ips: '🌐 IPs',
    saved_tab_snis: '🔒 SNIs',
    uuid_manager_title: 'UUID Manager',
    uuid_notice: '💡 Save UUIDs with nicknames. Click <strong>★</strong> in any UUID field to pick one from here instantly.',
    ip_lists_title: 'Saved IP Lists',
    ip_list_notice: '💡 Click <strong>★ Save</strong> next to any IP field to save, or <strong>★ Load</strong> to load a saved list.',
    sni_lists_title: 'Saved SNI Lists',
    sni_list_notice: '💡 Click <strong>★ Save SNIs</strong> next to any SNI field to save, or <strong>★ Load SNIs</strong> to load a saved list.',

    // Modals
    modal_load_ip_title: 'Load a Saved IP List',
    modal_load_sni_title: 'Load a Saved SNI List',
    modal_pick_uuid_title: 'Pick a Saved UUID',
    modal_save_profile_title: 'Save Profile',
    modal_profile_name_label: 'Profile Name',
    modal_sub_url_label: 'Subscription URL',
    modal_sub_url_optional: '(optional — enables one-click refresh)',

    // Error messages
    err_invalid_uuid: 'Invalid UUID format',

    // Toast messages (runtime)
    toast_new_uuid: 'New UUID generated',
    toast_copied: 'Copied!',
    toast_copy_failed: 'Copy failed',
    toast_cleared: 'Cleared',
    toast_loaded: 'Loaded',
    toast_loaded_successfully: 'Loaded successfully',
    toast_generated: ' generated',
    toast_generating_too_many: 'Cannot generate more than 50,000 links at once — reduce your IP or SNI list.',
    toast_no_ranges: 'No ranges found to expand',
    toast_expanded_to: 'Expanded to ',
    toast_ips_suffix: ' IPs',
    toast_uuid_required: 'UUID is required',
    toast_invalid_uuid: 'Invalid UUID format',
    toast_port_invalid: 'Port must be 1–65535',
    toast_add_ip: 'Add at least one IP / Host',
    toast_ips_empty: 'IPs list is empty',
    toast_sni_empty: 'SNI list is empty',
    toast_nothing_copy: 'Nothing to copy',
    toast_nothing_download: 'Nothing to download',
    toast_nothing_export: 'Nothing to export',
    toast_generate_first: 'Generate first',
    toast_downloading: 'Downloading...',
    toast_b64_downloaded: 'Base64 downloaded',
    toast_json_downloaded: 'JSON downloaded',
    toast_clash_downloaded: 'Clash YAML downloaded',
    toast_singbox_downloaded: 'Sing-box config downloaded',
    toast_downloaded: 'Downloaded',
    toast_shuffled: 'Shuffled!',
    toast_port_set: 'Port set to ',
    toast_parse_uri_first: 'Paste a URI first',
    toast_input_too_large: 'Input too large to parse',
    toast_must_start_vless: 'Must start with vless://',
    toast_parsed_ok: 'Parsed successfully',
    toast_parse_failed: 'Failed to parse URI',
    toast_nothing_parsed: 'Nothing parsed',
    toast_applied: 'Applied — ready to generate',
    toast_history_cleared: 'History cleared',
    toast_exported: 'Exported',
    toast_no_history: 'No history to export',
    toast_history_empty: 'History entry is empty',
    toast_profile_enter_name: 'Enter a profile name',
    toast_profile_saved: 'Profile saved',
    toast_profile_loaded: 'Profile loaded',
    toast_profile_deleted: 'Profile deleted',
    toast_profiles_cleared: 'All profiles cleared',
    toast_no_sub_url: 'No subscription URL saved for this profile',
    toast_refreshing_sub: 'Refreshing subscription...',
    toast_links_loaded: ' links loaded — click Deduplicate to clean',
    toast_refresh_failed: 'Refresh failed: ',
    toast_uuid_added: 'UUID added',
    toast_enter_uuid: 'Enter a UUID',
    toast_uuid_exists: 'UUID already saved',
    toast_custom_uuid_added: 'Custom UUID added',
    toast_uuid_deleted: 'UUID deleted',
    toast_uuid_applied: 'UUID applied',
    toast_enter_ip_label: 'Enter a label for this IP list',
    toast_enter_ip: 'Enter at least one IP / host',
    toast_ip_list_saved: 'IP list saved',
    toast_ip_list_loaded: 'IP list loaded',
    toast_ip_list_deleted: 'IP list deleted',
    toast_enter_sni_label: 'Enter a label for this SNI list',
    toast_enter_sni: 'Enter at least one SNI',
    toast_sni_list_saved: 'SNI list saved',
    toast_sni_list_loaded: 'SNI list loaded',
    toast_sni_list_deleted: 'SNI list deleted',
    toast_no_vless_links: 'No valid vless:// links found — decode or paste links first',
    toast_unique_removed: ' unique links, ',
    toast_removed_suffix: ' removed',
    toast_input_too_large_5mb: 'Input too large — max 5 MB',
    toast_input_too_large_2mb: 'Input too large — max 2 MB',
    toast_paste_b64_first: 'Paste a base64 string first',
    toast_no_vless_decoded: 'No vless:// links found in decoded content',
    toast_added_links: 'Added ',
    toast_links_to_tab: ' links to Links tab',
    toast_decode_failed: 'Failed to decode — is this valid base64?',
    toast_enter_sub_url: 'Enter a subscription URL',
    toast_fetching: '⏳ Fetching...',
    toast_fetching_sub: 'Fetching subscription...',
    toast_response_too_large: 'Subscription response too large',
    toast_no_vless_response: '✕ No vless:// links found in response',
    toast_loaded_links: '✓ Loaded ',
    toast_fetched_links: 'Fetched ',
    toast_fetch_failed: 'Fetch failed',
    toast_timed_out: 'Timed out after 15s',
    toast_fetch_decode_btn: '🌐 Fetch & Decode',
    toast_both_valid: 'Both links must be valid vless:// URIs',
    toast_nothing_encode: 'Nothing to encode',
    toast_encoded: 'Encoded',
    toast_nothing_decode: 'Nothing to decode',
    toast_decoded: 'Decoded',
    toast_invalid_b64: 'Invalid Base64',
    toast_no_vless_renamer: 'No valid vless:// links found',
    toast_links_renamed: ' links renamed',
    toast_add_hosts: 'Add hosts to test',
    toast_tcping_done: 'TCPing done — ',
    toast_reachable_suffix: ' reachable',
    toast_no_configs: 'No valid vless:// links found',
    toast_done_reachable: 'Done — ',
    toast_no_reachable: 'No reachable configs to export',
    toast_exported_fastest: 'Exported ',
    toast_fastest_suffix: ' fastest configs',
    toast_no_adv_links: 'No links in Advanced output — generate first',
    toast_no_bulk_links: 'No vless:// links in Bulk tab',
    toast_loaded_configs: 'Loaded ',
    toast_configs_suffix: ' configs',
    toast_profiles_exported: 'Profiles exported',
    toast_no_profiles: 'No profiles to export',
    toast_imported_profiles: 'Imported ',
    toast_profiles_suffix: ' profile(s)',
    toast_invalid_profiles: 'Invalid profiles file',
    toast_pinned: 'Pinned',
    toast_unpinned: 'Unpinned',
    toast_enter_label: 'Enter a label',
    toast_nothing_visible: 'Nothing visible to download',
    toast_nothing_save: 'SNI field is empty — nothing to save',

    // Dynamic HTML strings
    dyn_no_history: 'No history yet.<br>Generate some configs to see them here.',
    dyn_no_profiles: 'No profiles saved yet.<br>Hit <strong>💾 Save Profile</strong> in the Generate tab.',
    dyn_no_profiles_match: 'No profiles match',
    dyn_no_uuids: 'No UUIDs saved. Click "+ Generate & Add".',
    dyn_no_ip_lists: 'No IP lists saved.<br>Use <strong>★ Save IPs</strong> next to any IP field, or click <strong>✎ Add New</strong> above.',
    dyn_no_sni_lists: 'No SNI lists saved.<br>Use <strong>★ Save SNIs</strong> next to any SNI field, or click <strong>✎ Add New</strong> above.',
    dyn_no_saved_uuids: 'No saved UUIDs.<br>Add some in the 🗄 Saved Data tab.',
    dyn_no_saved_ips: 'No saved IP lists.<br>Use <strong>★ Save IPs</strong> to save one, or go to the 🗄 Saved Data tab.',
    dyn_no_saved_snis: 'No saved SNI lists.<br>Use <strong>★ Save SNIs</strong> to save one, or go to the 🗄 Saved Data tab.',
    dyn_link: 'link',
    dyn_links: 'links',
    dyn_config: 'config',
    dyn_configs: 'configs',
    dyn_entry: 'entry',
    dyn_entries: 'entries',
    dyn_sni: 'SNI',
    dyn_snis: 'SNIs',
    dyn_load_btn: 'Load',
    dyn_hide_qr: '✕ Hide QR',
    dyn_show_qr: '⬛ QR',
    dyn_testing: '⏳ Testing...',
    dyn_tcping_all_btn: '⚡ TCPing All',
    dyn_tcping_configs_btn: '⚡ TCPing Configs',
    dyn_testing_progress: 'Testing 0 / ',
    dyn_tcping_progress: 'TCPing ',
    dyn_of: ' / ',
    dyn_timeout_label: 'Timeout',
    dyn_unreachable: 'Unreachable',
    dyn_reachable_count: ' reachable',
    dyn_unreachable_count: ' unreachable',
    dyn_fastest: 'fastest: ',
    dyn_ms_avg: ' ms avg',
    dyn_ms: ' ms',
    dyn_paired: ' (paired)',
    dyn_ips_x_snis: ' IPs × ',
    dyn_snis_eq: ' SNIs = ',
    dyn_show_first: 'Showing first ',
    dyn_of_links: ' of ',
    dyn_links_dot: ' links · ',
    dyn_show_all: 'Show all (may be slow)',
    dyn_use_dl: ' · Use ↓ TXT to get the full list',
    dyn_critical_issues: '✕ Critical issues found',
    dyn_minor_issues: '⚠ Minor issues',
    dyn_config_looks_good: '✓ Config looks good',
    dyn_passed: ' passed · ',
    dyn_failed: ' failed',
    dyn_testing_tcp: 'testing...',
    dyn_fields_differ: ' field',
    dyn_fields_differ_plural: ' fields',
    dyn_differ_suffix: ' differ',
    dyn_links_identical: '✓ Links are identical',
    dyn_mode_label: ' mode',
    dyn_sub_label: 'SUB',
    dyn_pin_title: 'Pin',
    dyn_unpin_title: 'Unpin',
    dyn_confirm_large: ' links will be generated.\nThis may take a moment and use significant memory.\n\nContinue?',
    dyn_save_ip_prompt: 'Label for this IP list:',
    dyn_save_sni_prompt: 'Label for this SNI list:',
    dyn_fetching_sub_status: 'Fetching subscription...',
    dyn_response_too_large_status: '✕ Response too large (max 2 MB)',
    dyn_no_links_status: '✕ No vless:// links found in response',
    dyn_loaded_links_status: '✓ Loaded ',
    dyn_fetch_failed_status: '✕ Fetch failed: ',
    dyn_timed_out_msg: 'Timed out after 15s',
    dyn_links_loaded_msg: ' links loaded — click Deduplicate to clean',
    dyn_refresh_failed_msg: 'Refresh failed: ',
    dyn_transport_badge: ' transport',
    dyn_loaded_type: '✓ Loaded — type: ',
    dyn_uri_must_vless: '✕ URI must start with vless://',
    dyn_parse_failed: '✕ Failed to parse URI',
    dyn_must_vless: '✕ Must start with vless://',
    dyn_paste_vless_first: 'Paste a vless:// link first.',
    dyn_must_start_vless: '✕ Must start with vless://',
    dyn_parse_failed_malformed: '✕ Failed to parse URI — malformed link',
    dyn_nothing_generated: 'Nothing generated yet.',
    dyn_your_links_here: 'Your generated links will appear here.',
    dyn_0_links: '0 links',
    dyn_filtered: ' (filtered)',
    dyn_click_copy: 'Click to copy this link',
    dyn_history_time_links: ' links',
    dyn_entry_singular: 'y',
    dyn_entry_plural: 'ies',
  },

  fa: {
    // Header
    header_tag: '⬡ مجموعه تنظیمات پروکسی',
    header_sub: 'تولید · تجزیه · مدیریت · پروفایل تنظیمات VLESS',
    header_creator: 'ساخته شده توسط <a href="https://t.me/Blackkcore" target="_blank" rel="noopener">@Blackkcore</a> · تمامی حقوق محفوظ است',

    // Nav tabs
    tab_generate: '⚡ تولید',
    tab_profiles: '📁 پروفایل‌ها',
    tab_bulk: '📥 انبوه',
    tab_tools: '🔧 ابزارها',
    tab_saved: '🗄 داده‌های ذخیره‌شده',

    // Mode toggle
    mode_simple: '⚡ حالت ساده',
    mode_advanced: '⚙ حالت پیشرفته',

    // Simple mode
    simple_notice: '💡 هر لینک <code>vless://</code> را جهت بارگذاری خودکار تنظیمات جای‌گذاری کنید. برای تولید دسته‌ای، چندین IP یا SNI (هر کدام در یک خط) اضافه کنید. برای تولید فوری <code>Ctrl+Enter</code> را بفشارید.',
    simple_paste_title: 'لینک VLESS خود را جای‌گذاری کنید',
    simple_edit_title: 'ویرایش تنظیمات',

    // Labels
    label_uuid: 'UUID',
    label_port: 'پورت',
    label_ips: 'IP / هاست — هر کدام در یک خط',
    label_ips_hint: 'پشتیبانی از بازه: 1.2.3.1-50 · 1.2.3.0/24',
    label_sni: 'SNI — هر کدام در یک خط (برای نادیده گرفتن خالی بگذارید)',
    label_sni_short: 'SNI',
    label_pair_mode: 'حالت جفت‌سازی',
    label_host: 'هدر Host',
    label_path: 'مسیر',
    label_security: 'امنیت',
    label_fingerprint: 'اثر انگشت',
    label_alpn: 'ALPN',
    label_remark_tpl: 'قالب توضیح',
    label_prefix: 'مقدار پیشوند',
    label_xhttp_mode: 'حالت xhttp',
    label_extra_json: 'JSON اضافی',
    label_grpc_service: 'نام سرویس gRPC',
    label_allow_insecure: 'اجازه ناامن',
    label_output: 'خروجی',
    label_input: 'ورودی',
    label_type: 'نوع',
    label_encryption: 'رمزنگاری',
    label_encryption_hint: 'معمولاً هیچ',
    label_timeout_ms: 'تایم‌اوت (ms)',
    label_repeat: 'تکرار',
    label_label: 'برچسب',
    label_nickname: 'نام مستعار',
    label_ips_hosts: 'IP / هاست‌ها',
    label_ips_hosts_desc: 'هر کدام در یک خط',
    label_ranges_cidr: 'پشتیبانی از بازه و CIDR',
    label_ips_hosts_one_per_line: 'IP / هاست‌ها (هر کدام در یک خط)',
    label_snis_one_per_line: 'SNI‌ها (هر کدام در یک خط)',

    // Pair mode hints
    pair_mode_off: 'خاموش — هر IP × هر SNI (ماتریس کامل)',
    pair_mode_off_adv: 'خاموش — ماتریس کامل IP × SNI',
    pair_mode_on: 'روشن — IP[1]↔SNI[1], IP[2]↔SNI[2], … (جفت‌سازی هم‌اندیس)',

    // Hints
    remark_vars_hint: 'متغیرها: {prefix} {ip} {sni} {port} {idx}',
    prefix_hint: '{prefix} را در قالب بالا پر می‌کند',
    sni_desc: 'هر کدام در یک خط — ضرب در IP‌ها',

    // Buttons
    btn_autodetect: '▶ تشخیص خودکار و بارگذاری',
    btn_clear: '✕ پاک کردن',
    btn_clear_all: '✕ پاک کردن همه',
    btn_generate: '⚡ تولید',
    btn_copy: '⎘ کپی',
    btn_copy_output: '⎘ کپی خروجی',
    btn_dl_txt: '↓ TXT',
    btn_dl_b64: '↓ Base64',
    btn_qr: '⬛ QR',
    btn_save_profile: '💾 ذخیره پروفایل',
    btn_prev: '‹ قبلی',
    btn_next: 'بعدی ›',
    btn_expand: '⤢ گسترش',
    btn_save_ips: '★ ذخیره',
    btn_load_ips: '★ بارگذاری',
    btn_save_snis: '★ ذخیره SNI',
    btn_load_snis: '★ بارگذاری SNI',
    btn_parse: '▶ تجزیه و پیش‌نمایش',
    btn_apply_to_generator: 'اعمال به تولیدکننده',
    btn_dismiss: 'رد کردن',
    btn_export: '↓ خروجی',
    btn_export_all: '↓ خروجی همه',
    btn_import: '↑ ورودی',
    btn_dl_json: '↓ JSON',
    btn_dl_clash: '↓ Clash',
    btn_dl_singbox: '↓ Sing-box',
    btn_shuffle: '⇌ درهم‌کردن',
    btn_validate: '🔍 اعتبارسنجی',
    btn_validate_ping: '🔍 + TCPing',
    btn_compare: '🔍 مقایسه',
    btn_encode: '→ رمزگذاری به Base64',
    btn_decode: '← رمزگشایی از Base64',
    btn_rename: '✏ تغییر نام',
    btn_download: '↓ دانلود',
    btn_tcping_all: '⚡ TCPing همه',
    btn_tcping_configs: '⚡ TCPing تنظیمات',
    btn_export_fastest: '↓ خروجی سریع‌ترین',
    btn_load_from_adv: '📋 بارگذاری از خروجی پیشرفته',
    btn_load_from_bulk: '📋 بارگذاری از انبوه',
    btn_decode_move: '↓ رمزگشایی و انتقال به لینک‌ها',
    btn_fetch_decode: '🌐 دریافت و رمزگشایی',
    btn_dedup_all: '▶ حذف تکراری‌ها',
    btn_gen_add_uuid: '↻ تولید و افزودن',
    btn_add_custom_uuid: '+ UUID دلخواه',
    btn_add: '+ افزودن',
    btn_save: '+ ذخیره',
    btn_add_new: '✎ افزودن جدید',
    btn_cancel: '✕ لغو',
    btn_pick_saved: 'انتخاب ذخیره‌شده',

    // Stats
    stat_links: 'لینک',
    stat_ips: 'IP',
    stat_snis: 'SNI',
    stat_total: 'کل',
    stat_unique: 'منحصربه‌فرد',
    stat_removed: 'حذف‌شده',

    // Output empty states
    output_empty: 'لینک‌های تولیدشده اینجا نمایش داده می‌شوند.',
    adv_output_empty: 'هنوز چیزی تولید نشده.',

    // Advanced tabs
    adv_tab_generate: 'تولید',
    adv_tab_import: 'ورودی / تجزیه',
    adv_tab_history: 'تاریخچه',
    adv_core_title: 'هسته',
    adv_ips_snis_title: 'IP‌ها و SNI‌ها',
    adv_tls_title: 'TLS',
    adv_transport_title: 'انتقال',
    adv_paste_uri_title: 'جای‌گذاری URI از نوع vless://',
    adv_parsed_fields_title: 'فیلدهای تجزیه‌شده',
    adv_history_title: 'تاریخچه جلسه',

    // Sort options
    sort_default: '— مرتب‌سازی —',
    sort_asc: 'الف→ی (توضیح)',
    sort_desc: 'ی→الف (توضیح)',
    sort_ip: 'بر اساس IP',
    sort_by_rtt: 'مرتب‌سازی بر اساس RTT',

    // Profiles
    profiles_title: 'پروفایل‌های ذخیره‌شده',
    profiles_notice: '💡 تنظیمات تولیدکننده را به عنوان پروفایل‌های نام‌گذاری‌شده ذخیره کنید و فوراً بارگذاری کنید.',

    // Bulk
    bulk_title: 'ورودی انبوه و حذف تکراری',
    bulk_notice: '💡 از <strong>سه نوع ورودی</strong> پشتیبانی می‌کند — هر ترکیبی را جای‌گذاری کرده و روی حذف تکراری کلیک کنید:<br>&nbsp;• لینک‌های خام <code>vless://</code> (هر کدام در یک خط)<br>&nbsp;• رشته اشتراک رمزگذاری‌شده Base64<br>&nbsp;• URL اشتراک (دریافت و رمزگشایی خودکار)',
    bulk_tab_links: '📋 لینک‌های vless://',
    bulk_tab_b64: '🔐 Base64 / رشته اشتراک',
    bulk_tab_url: '🌐 URL اشتراک',
    bulk_links_label: 'لینک‌های vless:// را جای‌گذاری کنید (هر کدام در یک خط)',
    bulk_b64_label: 'محتوای اشتراک base64 را جای‌گذاری کنید',
    bulk_url_label: 'URL اشتراک',
    bulk_output_label: 'خروجی بدون تکراری',
    strict_dedup_label: 'حذف تکراری دقیق',

    // Tools
    tools_balancer_title: '⚖ بالانسر تنظیمات — تولید JSON برای v2rayNG / sing-box',
    tools_balancer_notice: 'هر متنی که شامل لینک‌های vless:// باشد را جای‌گذاری کنید. یک تنظیم JSON آماده با بالانس بار خودکار برای v2rayNG (Xray) یا sing-box 1.13+ تولید می‌کند.',
    tools_balancer_input_label: 'لینک‌های ورودی',
    tools_balancer_nodes_label: 'نودهای تجزیه‌شده',
    tools_balancer_format_label: 'فرمت خروجی',
    tools_balancer_xray: 'Xray (v2rayNG)',
    tools_balancer_singbox: 'sing-box 1.13+',
    tools_balancer_strategy_label: 'استراتژی بالانسر',
    tools_balancer_least_ping: '🚀 کمترین پینگ (پیشنهادی)',
    tools_balancer_random: '🎲 تصادفی / انتخابگر',
    tools_balancer_probe_url_label: 'آدرس پروب',
    tools_balancer_probe_interval_label: 'فاصله پروب',
    tools_balancer_socks_port_label: 'پورت SOCKS محلی',
    tools_balancer_generate: '⚡ تولید تنظیمات',
    tools_balancer_download: '↓ دانلود JSON',
    tools_balancer_output_label: 'JSON تولیدشده',
    tools_validator_title: '⚡ اعتبارسنج تنظیمات — بررسی لینک',
    tools_validator_notice: 'یک لینک vless:// جای‌گذاری کنید و بررسی فوری سلامت دریافت کنید — فرمت UUID، محدوده پورت، فیلدهای ضروری، پارامترهای TLS، و TCPing برای تأیید دسترسی به سرور.',
    tools_validator_label: 'لینک vless:// برای اعتبارسنجی',
    tools_diff_title: 'مقایسه تنظیمات — مقایسه دو لینک',
    tools_diff_link_a: 'لینک A',
    tools_diff_link_b: 'لینک B',
    tools_diff_differences: 'تفاوت‌ها',
    tools_b64_title: 'رمزگذار / رمزگشای Base64',
    tools_renamer_title: 'تغییر نام انبوه توضیح',
    tools_renamer_notice: 'لینک‌ها را جای‌گذاری کنید و یک قالب توضیح جدید برای همه آن‌ها اعمال کنید.',
    tools_renamer_links_label: 'لینک‌ها (هر کدام در یک خط)',
    tools_tcping_title: 'TCPing — بررسی دسترسی IP / هاست‌ها',
    tools_tcping_notice: 'زمان رفت و برگشت TCP SYN-ACK خام به host:port را اندازه‌گیری می‌کند — همان روش v2rayN Ctrl+O. دسترسی شبکه را آزمایش می‌کند، نه عملکرد پروکسی.',
    tools_tcping_hosts_label: 'IP / هاست‌ها برای آزمایش (هر کدام در یک خط)',
    tools_cfg_tcping_title: 'TCPing تنظیمات — آزمایش تنظیمات vless://',
    tools_cfg_tcping_notice: 'لینک‌های vless:// را جای‌گذاری کنید و server:port هر تنظیم را TCPing کنید. RTT هر تنظیم با نام توضیح نمایش داده می‌شود — مثل آزمایش TCPing هر سرور در v2rayN (Ctrl+O).',
    tools_cfg_tcping_label: 'لینک‌های vless:// (هر کدام در یک خط)',

    // Saved data
    saved_tab_uuids: '🔑 UUID‌ها',
    saved_tab_ips: '🌐 IP‌ها',
    saved_tab_snis: '🔒 SNI‌ها',
    uuid_manager_title: 'مدیریت UUID',
    uuid_notice: '💡 UUID‌ها را با نام مستعار ذخیره کنید. برای انتخاب فوری، روی <strong>★</strong> در هر فیلد UUID کلیک کنید.',
    ip_lists_title: 'لیست‌های IP ذخیره‌شده',
    ip_list_notice: '💡 برای ذخیره، روی <strong>★ ذخیره</strong> کنار هر فیلد IP کلیک کنید، یا برای بارگذاری لیست ذخیره‌شده، روی <strong>★ بارگذاری</strong> کلیک کنید.',
    sni_lists_title: 'لیست‌های SNI ذخیره‌شده',
    sni_list_notice: '💡 برای ذخیره، روی <strong>★ ذخیره SNI</strong> کنار هر فیلد SNI کلیک کنید، یا برای بارگذاری لیست ذخیره‌شده، روی <strong>★ بارگذاری SNI</strong> کلیک کنید.',

    // Modals
    modal_load_ip_title: 'بارگذاری لیست IP ذخیره‌شده',
    modal_load_sni_title: 'بارگذاری لیست SNI ذخیره‌شده',
    modal_pick_uuid_title: 'انتخاب UUID ذخیره‌شده',
    modal_save_profile_title: 'ذخیره پروفایل',
    modal_profile_name_label: 'نام پروفایل',
    modal_sub_url_label: 'URL اشتراک',
    modal_sub_url_optional: '(اختیاری — امکان بازخوانی با یک کلیک)',

    // Error messages
    err_invalid_uuid: 'فرمت UUID نامعتبر است',

    // Toast messages (runtime)
    toast_new_uuid: 'UUID جدید تولید شد',
    toast_copied: 'کپی شد!',
    toast_copy_failed: 'کپی ناموفق',
    toast_cleared: 'پاک شد',
    toast_loaded: 'بارگذاری شد',
    toast_loaded_successfully: 'با موفقیت بارگذاری شد',
    toast_generated: ' تولید شد',
    toast_generating_too_many: 'نمی‌توان بیش از ۵۰٬۰۰۰ لینک یکجا تولید کرد — لیست IP یا SNI را کاهش دهید.',
    toast_no_ranges: 'هیچ بازه‌ای برای گسترش یافت نشد',
    toast_expanded_to: 'گسترش یافت به ',
    toast_ips_suffix: ' IP',
    toast_uuid_required: 'UUID الزامی است',
    toast_invalid_uuid: 'فرمت UUID نامعتبر است',
    toast_port_invalid: 'پورت باید بین ۱ تا ۶۵۵۳۵ باشد',
    toast_add_ip: 'حداقل یک IP / هاست اضافه کنید',
    toast_ips_empty: 'لیست IP خالی است',
    toast_sni_empty: 'لیست SNI خالی است',
    toast_nothing_copy: 'چیزی برای کپی وجود ندارد',
    toast_nothing_download: 'چیزی برای دانلود وجود ندارد',
    toast_nothing_export: 'چیزی برای خروجی وجود ندارد',
    toast_generate_first: 'ابتدا تولید کنید',
    toast_downloading: 'در حال دانلود...',
    toast_b64_downloaded: 'Base64 دانلود شد',
    toast_json_downloaded: 'JSON دانلود شد',
    toast_clash_downloaded: 'فایل YAML Clash دانلود شد',
    toast_singbox_downloaded: 'تنظیمات Sing-box دانلود شد',
    toast_downloaded: 'دانلود شد',
    toast_shuffled: 'درهم شد!',
    toast_port_set: 'پورت تنظیم شد به ',
    toast_parse_uri_first: 'ابتدا یک URI جای‌گذاری کنید',
    toast_input_too_large: 'ورودی برای تجزیه خیلی بزرگ است',
    toast_must_start_vless: 'باید با vless:// شروع شود',
    toast_parsed_ok: 'با موفقیت تجزیه شد',
    toast_parse_failed: 'تجزیه URI ناموفق بود',
    toast_nothing_parsed: 'چیزی تجزیه نشده',
    toast_applied: 'اعمال شد — آماده تولید',
    toast_history_cleared: 'تاریخچه پاک شد',
    toast_exported: 'خروجی گرفته شد',
    toast_no_history: 'تاریخچه‌ای برای خروجی وجود ندارد',
    toast_history_empty: 'ورودی تاریخچه خالی است',
    toast_profile_enter_name: 'نام پروفایل را وارد کنید',
    toast_profile_saved: 'پروفایل ذخیره شد',
    toast_profile_loaded: 'پروفایل بارگذاری شد',
    toast_profile_deleted: 'پروفایل حذف شد',
    toast_profiles_cleared: 'همه پروفایل‌ها پاک شدند',
    toast_no_sub_url: 'هیچ URL اشتراکی برای این پروفایل ذخیره نشده',
    toast_refreshing_sub: 'در حال بازخوانی اشتراک...',
    toast_links_loaded: ' لینک بارگذاری شد — برای پاکسازی روی حذف تکراری کلیک کنید',
    toast_refresh_failed: 'بازخوانی ناموفق: ',
    toast_uuid_added: 'UUID افزوده شد',
    toast_enter_uuid: 'یک UUID وارد کنید',
    toast_uuid_exists: 'UUID قبلاً ذخیره شده',
    toast_custom_uuid_added: 'UUID دلخواه افزوده شد',
    toast_uuid_deleted: 'UUID حذف شد',
    toast_uuid_applied: 'UUID اعمال شد',
    toast_enter_ip_label: 'یک برچسب برای این لیست IP وارد کنید',
    toast_enter_ip: 'حداقل یک IP / هاست وارد کنید',
    toast_ip_list_saved: 'لیست IP ذخیره شد',
    toast_ip_list_loaded: 'لیست IP بارگذاری شد',
    toast_ip_list_deleted: 'لیست IP حذف شد',
    toast_enter_sni_label: 'یک برچسب برای این لیست SNI وارد کنید',
    toast_enter_sni: 'حداقل یک SNI وارد کنید',
    toast_sni_list_saved: 'لیست SNI ذخیره شد',
    toast_sni_list_loaded: 'لیست SNI بارگذاری شد',
    toast_sni_list_deleted: 'لیست SNI حذف شد',
    toast_no_vless_links: 'هیچ لینک معتبر vless:// یافت نشد — ابتدا رمزگشایی یا جای‌گذاری کنید',
    toast_unique_removed: ' لینک منحصربه‌فرد، ',
    toast_removed_suffix: ' حذف شد',
    toast_input_too_large_5mb: 'ورودی خیلی بزرگ است — حداکثر ۵ مگابایت',
    toast_input_too_large_2mb: 'ورودی خیلی بزرگ است — حداکثر ۲ مگابایت',
    toast_paste_b64_first: 'ابتدا یک رشته base64 جای‌گذاری کنید',
    toast_no_vless_decoded: 'هیچ لینک vless:// در محتوای رمزگشایی‌شده یافت نشد',
    toast_added_links: 'افزوده شد ',
    toast_links_to_tab: ' لینک به تب لینک‌ها',
    toast_decode_failed: 'رمزگشایی ناموفق — آیا این base64 معتبر است؟',
    toast_enter_sub_url: 'یک URL اشتراک وارد کنید',
    toast_fetching: '⏳ در حال دریافت...',
    toast_fetching_sub: 'در حال دریافت اشتراک...',
    toast_response_too_large: 'پاسخ اشتراک خیلی بزرگ است',
    toast_no_vless_response: '✕ هیچ لینک vless:// در پاسخ یافت نشد',
    toast_loaded_links: '✓ بارگذاری شد ',
    toast_fetched_links: 'دریافت شد ',
    toast_fetch_failed: 'دریافت ناموفق',
    toast_timed_out: 'بعد از ۱۵ ثانیه تایم‌اوت شد',
    toast_fetch_decode_btn: '🌐 دریافت و رمزگشایی',
    toast_both_valid: 'هر دو لینک باید URI معتبر vless:// باشند',
    toast_nothing_encode: 'چیزی برای رمزگذاری وجود ندارد',
    toast_encoded: 'رمزگذاری شد',
    toast_nothing_decode: 'چیزی برای رمزگشایی وجود ندارد',
    toast_decoded: 'رمزگشایی شد',
    toast_invalid_b64: 'Base64 نامعتبر',
    toast_no_vless_renamer: 'هیچ لینک معتبر vless:// یافت نشد',
    toast_links_renamed: ' لینک تغییر نام داد',
    toast_add_hosts: 'هاست‌هایی برای آزمایش اضافه کنید',
    toast_tcping_done: 'TCPing تمام شد — ',
    toast_reachable_suffix: ' قابل دسترس',
    toast_no_configs: 'هیچ لینک معتبر vless:// یافت نشد',
    toast_done_reachable: 'تمام شد — ',
    toast_no_reachable: 'هیچ تنظیم قابل دسترسی برای خروجی وجود ندارد',
    toast_exported_fastest: 'خروجی گرفته شد ',
    toast_fastest_suffix: ' تنظیم سریع‌ترین',
    toast_no_adv_links: 'هیچ لینکی در خروجی پیشرفته وجود ندارد — ابتدا تولید کنید',
    toast_no_bulk_links: 'هیچ لینک vless:// در تب انبوه وجود ندارد',
    toast_loaded_configs: 'بارگذاری شد ',
    toast_configs_suffix: ' تنظیم',
    toast_profiles_exported: 'پروفایل‌ها خروجی گرفته شدند',
    toast_no_profiles: 'هیچ پروفایلی برای خروجی وجود ندارد',
    toast_imported_profiles: 'وارد شد ',
    toast_profiles_suffix: ' پروفایل',
    toast_invalid_profiles: 'فایل پروفایل نامعتبر',
    toast_pinned: 'سنجاق شد',
    toast_unpinned: 'از سنجاق درآمد',
    toast_enter_label: 'یک برچسب وارد کنید',
    toast_nothing_visible: 'هیچ چیز قابل مشاهده‌ای برای دانلود وجود ندارد',
    toast_nothing_save: 'فیلد SNI خالی است — چیزی برای ذخیره وجود ندارد',

    // Dynamic HTML strings
    dyn_no_history: 'هنوز تاریخچه‌ای وجود ندارد.<br>برای مشاهده، تنظیماتی تولید کنید.',
    dyn_no_profiles: 'هنوز پروفایلی ذخیره نشده.<br>در تب تولید روی <strong>💾 ذخیره پروفایل</strong> کلیک کنید.',
    dyn_no_profiles_match: 'هیچ پروفایلی مطابق با',
    dyn_no_uuids: 'هیچ UUID‌ای ذخیره نشده. روی "+ تولید و افزودن" کلیک کنید.',
    dyn_no_ip_lists: 'هیچ لیست IP‌ای ذخیره نشده.<br>از <strong>★ ذخیره</strong> کنار هر فیلد IP استفاده کنید، یا روی <strong>✎ افزودن جدید</strong> کلیک کنید.',
    dyn_no_sni_lists: 'هیچ لیست SNI‌ای ذخیره نشده.<br>از <strong>★ ذخیره SNI</strong> کنار هر فیلد SNI استفاده کنید، یا روی <strong>✎ افزودن جدید</strong> کلیک کنید.',
    dyn_no_saved_uuids: 'هیچ UUID ذخیره‌شده‌ای وجود ندارد.<br>در تب 🗄 داده‌های ذخیره‌شده اضافه کنید.',
    dyn_no_saved_ips: 'هیچ لیست IP ذخیره‌شده‌ای وجود ندارد.<br>از <strong>★ ذخیره</strong> برای ذخیره استفاده کنید، یا به تب 🗄 داده‌های ذخیره‌شده بروید.',
    dyn_no_saved_snis: 'هیچ لیست SNI ذخیره‌شده‌ای وجود ندارد.<br>از <strong>★ ذخیره SNI</strong> برای ذخیره استفاده کنید، یا به تب 🗄 داده‌های ذخیره‌شده بروید.',
    dyn_link: 'لینک',
    dyn_links: 'لینک',
    dyn_config: 'تنظیم',
    dyn_configs: 'تنظیم',
    dyn_entry: 'ورودی',
    dyn_entries: 'ورودی',
    dyn_sni: 'SNI',
    dyn_snis: 'SNI',
    dyn_load_btn: 'بارگذاری',
    dyn_hide_qr: '✕ پنهان کردن QR',
    dyn_show_qr: '⬛ QR',
    dyn_testing: '⏳ در حال آزمایش...',
    dyn_tcping_all_btn: '⚡ TCPing همه',
    dyn_tcping_configs_btn: '⚡ TCPing تنظیمات',
    dyn_testing_progress: 'آزمایش ۰ / ',
    dyn_tcping_progress: 'TCPing ',
    dyn_of: ' / ',
    dyn_timeout_label: 'تایم‌اوت',
    dyn_unreachable: 'غیرقابل دسترس',
    dyn_reachable_count: ' قابل دسترس',
    dyn_unreachable_count: ' غیرقابل دسترس',
    dyn_fastest: 'سریع‌ترین: ',
    dyn_ms_avg: ' ms میانگین',
    dyn_ms: ' ms',
    dyn_paired: ' (جفت‌شده)',
    dyn_ips_x_snis: ' IP × ',
    dyn_snis_eq: ' SNI = ',
    dyn_show_first: 'نمایش ',
    dyn_of_links: ' اول از ',
    dyn_links_dot: ' لینک · ',
    dyn_show_all: 'نمایش همه (ممکن است کند باشد)',
    dyn_use_dl: ' · از ↓ TXT برای دریافت لیست کامل استفاده کنید',
    dyn_critical_issues: '✕ مشکلات بحرانی یافت شد',
    dyn_minor_issues: '⚠ مشکلات جزئی',
    dyn_config_looks_good: '✓ تنظیمات به نظر خوب است',
    dyn_passed: ' قبول · ',
    dyn_failed: ' رد',
    dyn_testing_tcp: 'در حال آزمایش...',
    dyn_fields_differ: ' فیلد',
    dyn_fields_differ_plural: ' فیلد',
    dyn_differ_suffix: ' متفاوت',
    dyn_links_identical: '✓ لینک‌ها یکسان هستند',
    dyn_mode_label: ' حالت',
    dyn_sub_label: 'اشتراک',
    dyn_pin_title: 'سنجاق',
    dyn_unpin_title: 'از سنجاق درآوردن',
    dyn_confirm_large: ' لینک تولید خواهد شد.\nاین ممکن است کمی طول بکشد و حافظه زیادی مصرف کند.\n\nادامه می‌دهید؟',
    dyn_save_ip_prompt: 'برچسب برای این لیست IP:',
    dyn_save_sni_prompt: 'برچسب برای این لیست SNI:',
    dyn_fetching_sub_status: 'در حال دریافت اشتراک...',
    dyn_response_too_large_status: '✕ پاسخ خیلی بزرگ است (حداکثر ۲ مگابایت)',
    dyn_no_links_status: '✕ هیچ لینک vless:// در پاسخ یافت نشد',
    dyn_loaded_links_status: '✓ بارگذاری شد ',
    dyn_fetch_failed_status: '✕ دریافت ناموفق: ',
    dyn_timed_out_msg: 'بعد از ۱۵ ثانیه تایم‌اوت شد',
    dyn_links_loaded_msg: ' لینک بارگذاری شد — برای پاکسازی روی حذف تکراری کلیک کنید',
    dyn_refresh_failed_msg: 'بازخوانی ناموفق: ',
    dyn_transport_badge: ' انتقال',
    dyn_loaded_type: '✓ بارگذاری شد — نوع: ',
    dyn_uri_must_vless: '✕ URI باید با vless:// شروع شود',
    dyn_parse_failed: '✕ تجزیه URI ناموفق بود',
    dyn_must_vless: '✕ باید با vless:// شروع شود',
    dyn_paste_vless_first: 'ابتدا یک لینک vless:// جای‌گذاری کنید.',
    dyn_must_start_vless: '✕ باید با vless:// شروع شود',
    dyn_parse_failed_malformed: '✕ تجزیه URI ناموفق بود — لینک ناقص است',
    dyn_nothing_generated: 'هنوز چیزی تولید نشده.',
    dyn_your_links_here: 'لینک‌های تولیدشده اینجا نمایش داده می‌شوند.',
    dyn_0_links: '۰ لینک',
    dyn_filtered: ' (فیلتر شده)',
    dyn_click_copy: 'برای کپی کلیک کنید',
    dyn_history_time_links: ' لینک',
    dyn_entry_singular: 'ورودی',
    dyn_entry_plural: 'ورودی',
  }
};

// Get a translation string
function t(key) {
  var lang = _currentLang;
  if (_translations[lang] && _translations[lang][key] !== undefined) {
    return _translations[lang][key];
  }
  if (_translations['en'] && _translations['en'][key] !== undefined) {
    return _translations['en'][key];
  }
  return key;
}

// Apply translations to all elements with data-i18n attributes
function applyTranslations() {
  var lang = _currentLang;

  // Text content translations
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var val = t(key);
    if (val !== key) el.textContent = val;
  });

  // HTML content translations (for elements with HTML like <code>, <strong>)
  document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-html');
    var val = t(key);
    if (val !== key) el.innerHTML = val;
  });

  // Placeholder translations
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-placeholder');
    var val = t(key);
    if (val !== key) el.placeholder = val;
  });

  // Title attribute translations
  document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-title');
    var val = t(key);
    if (val !== key) el.title = val;
  });
}

// Toggle between English and Persian
function toggleLang() {
  var wrap = document.querySelector('.wrap');
  var btn = document.getElementById('langToggle');

  // Animate out
  if (wrap) {
    wrap.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
    wrap.style.opacity = '0';
    wrap.style.transform = 'translateY(6px)';
  }
  if (btn) {
    btn.style.transition = 'transform 0.18s ease';
    btn.style.transform = 'rotateY(90deg)';
  }

  setTimeout(function() {
    _currentLang = _currentLang === 'en' ? 'fa' : 'en';
    var html = document.documentElement;

    if (_currentLang === 'fa') {
      html.setAttribute('lang', 'fa');
      html.setAttribute('dir', 'rtl');
      if (btn) btn.textContent = 'EN';
      if (btn) btn.title = 'Switch to English / تغییر به انگلیسی';
    } else {
      html.setAttribute('lang', 'en');
      html.setAttribute('dir', 'ltr');
      if (btn) btn.textContent = 'FA';
      if (btn) btn.title = 'Switch language / تغییر زبان';
    }

    applyTranslations();
    lsSet('bc_lang', _currentLang);

    // Re-render dynamic content
    renderProfiles();
    renderUUIDs();
    renderIPLists();
    renderSNILists();
    renderHist();

    // Update pair mode hints
    var sPairMode = document.getElementById('s_pairMode');
    var aPairMode = document.getElementById('a_pairMode');
    if (sPairMode) togglePairHint('s_pairMode', 's_pairHint', t('pair_mode_off'));
    if (aPairMode) togglePairHint('a_pairMode', 'a_pairHint');

    // Update output empty states
    var sOut = document.getElementById('sOut');
    var aOut = document.getElementById('aOut');
    if (sOut && sOut.classList.contains('empty')) sOut.textContent = t('output_empty');
    if (aOut && aOut.classList.contains('empty')) aOut.textContent = t('adv_output_empty');

    // Update badges — check both EN and FA zero-link values so FA→EN also works
    var _zeroLinks = ['0 links', '۰ لینک'];
    var sBadge = document.getElementById('sBadge');
    var aBadge = document.getElementById('aBadge');
    if (sBadge && _zeroLinks.indexOf(sBadge.textContent) !== -1) sBadge.textContent = t('dyn_0_links');
    if (aBadge && _zeroLinks.indexOf(aBadge.textContent) !== -1) aBadge.textContent = t('dyn_0_links');

    // Animate back in
    if (wrap) {
      wrap.style.opacity = '1';
      wrap.style.transform = 'translateY(0)';
      setTimeout(function() { wrap.style.transition = ''; wrap.style.transform = ''; wrap.style.opacity = ''; }, 220);
    }
    if (btn) {
      btn.style.transform = 'rotateY(0deg)';
      setTimeout(function() { btn.style.transition = ''; btn.style.transform = ''; }, 220);
    }
  }, 180);
}

// Initialize language from saved preference
(function initLang() {
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('bc_lang')); } catch(e) {}
  if (saved === 'fa') {
    _currentLang = 'fa';
    var html = document.documentElement;
    html.setAttribute('lang', 'fa');
    html.setAttribute('dir', 'rtl');
    var btn = document.getElementById('langToggle');
    if (btn) btn.textContent = 'EN';
  }
})();

// Apply translations after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  applyTranslations();
});
