// js/data/strings.js — every static user-facing string in MindFrame, in one place (push28).
// Grouped by feature (one group per source file), each group headed by what that file does,
// each entry tagged with the function that uses it. Change words here, not in the feature files.
//
// API (tiny):
//   Str.t("words.card.some_key")              → the string
//   Str.t("words.x", { name: "Ada" })         → "{{name}}" placeholders filled (String(value))
//   Str.list("practices.LIBRARY.steps")       → a fresh copy of a list of strings
//   Str.has(key), Str.keys()                  → lookup helpers (tests, tools)
//   Str.apply(root)                           → fills [data-t] / [data-t-placeholder|aria-label|title] in index.html
// Missing keys throw, so a typo fails a test instead of showing a blank.
// Large data (verses, films, songs, credits entries, stories, games) stays in its own file;
// js/data/index.js lists where each lives.
(function (MF) {
  "use strict";
  const S = {

    // ===== index.html — the page's static labels (filled by Str.apply at load) =====
    "html": {
      "h1.mindframe": "MindFrame", // <h1>
      "p.a_quiet_place_to": "A quiet place to look at a thought.", // <p>
      "mode_write": "Write", // #mode-write
      "mode_pick": "Pick feelings", // #mode-pick
      "label.what_s_on_your": "What's on your mind?", // <label>
      "picker_title": "Tap to set how strong: off, a little, quite, strongly.", // #picker-title
      "pick_reset": "Clear", // #pick-reset
      "update": "Update", // #update
      "p.private_your_words_stay": "Private: your words stay on this device unless you save them to the journal. Nothing goes online unless you tap Find more online, which sends only film genres.", // <p>
      "strong.a_little_fawn_has": "A little fawn has come to keep you company.", // <strong>
      "label.your_companion_s_name": "Your companion's name", // <label>
      "name_save": "Name it", // #name-save
      "name_skip": "Skip (call it Willow)", // #name-skip
      "step_try": "Try it together", // #step-try
      "more_toggle": "See more", // #more-toggle
      "scripture_next": "Another verse", // #scripture-next
      "forgive_open": "Open the forgiveness guide", // #forgive-open
      "free_try": "Try the self-compassion break", // #free-try
      "free_grace": "Forgive myself", // #free-grace
      "copy": "Copy", // #copy
      "pet_title": "Willow", // #pet-title
      "button.close": "Close", // <button>
      "span.growth": "Growth", // <span>
      "strong.watch_something": "Watch something", // <strong>
      "small.want_to_watch_something": "Want to watch something gentle together?", // <small>
      "strong.anchor": "Anchor", // <strong>
      "small.how_far_you_are": "How far you are from your anchor, and your path", // <small>
      "strong.about_me": "About me", // <strong>
      "small.optional_hobbies_and_work": "Optional: hobbies and work, kept on this device", // <small>
      "strong.credits": "Credits", // <strong>
      "small.the_researchers_and_sources": "The researchers and sources MindFrame stands on", // <small>
      "pet_rename": "Rename", // #pet-rename
      "pet_reset": "Reset growth", // #pet-reset
      "v_writer_title": "Write a story", // #v-writer-title
      "story_go": "Write a story", // #story-go
      "journal_save": "Save to journal", // #journal-save
      "accept": "Accept step", // #accept
      "play": "Play this story", // #play
      "story_again": "Another story", // #story-again
      "game_next": "Next", // #game-next
      "h3.comfort_story_from_a": "Comfort story from a public AI", // <h3>
      "p.optional_mindframe_writes_its": "Optional. MindFrame writes its own replies from the equation and makes no network calls. This builds a prompt from the reading only (never your words) that you can read, edit, and open in a new tab.", // <p>
      "comfort_go": "Comfort story from a public AI", // #comfort-go
      "strong.only_this_text_will": "Only this text will be shared. Your journal stays on your phone.", // <strong>
      "label.prompt_for_the_public": "Prompt for the public AI", // <label>
      "open_grok": "Open in Grok", // #open-grok
      "open_chatgpt": "Open in ChatGPT", // #open-chatgpt
      "comfort_copy": "Copy prompt", // #comfort-copy
      "h3.journal": "Journal", // <h3>
      "p.only_what_you_save": "Only what you save here is kept, on this device.", // <p>
      "journal_clear": "Clear journal", // #journal-clear
      "v_historian_title": "My days", // #v-historian-title
      "save": "Save checkpoint", // #save
      "h3.checkpoints": "Checkpoints", // <h3>
      "cps_empty": "None yet. Save one to come back to it.", // #cps-empty
      "v_analyzer_title": "Look closer", // #v-analyzer-title
      "h3.all_insights_from_your": "All insights from your reading", // <h3>
      "h3.how_they_connect": "How they connect", // <h3>
      "h3.hidden_pulls_reality_check": "Hidden pulls, reality check and forgiveness cues", // <h3>
      "h3.the_nine_movers": "The nine movers", // <h3>
      "v_scribe_title": "Save & share code", // #v-scribe-title
      "p.your_session_as_plain": "Your session as plain .mf code: numbers and labels only, never your words.", // <p>
      "span.your_freeing_mix": "Your freeing mix", // <span>
      "copy_mix": "Copy freeing mix", // #copy-mix
      "copy_code": "Copy code", // #copy-code
      "download": "Download .mf.txt", // #download
      "label.paste_mf_code": "Paste .mf code", // <label>
      "label.or_choose_a_file": "Or choose a file", // <label>
      "import_go": "Restore from code", // #import-go
      "clear": "Start over", // #clear
      "v_scientist_title": "Show the math", // #v-scientist-title
      "p.every_result_comes_from": "Every result comes from one function: step = act(clip01(e + a(e)(h − e) + b·s(e))). Model numbers, not measurements of you.", // <p>
      "h3.adjust_numbers": "Adjust numbers", // <h3>
      "p.set_any_mover_by": "Set any mover by hand; new words add to these. Tap Update to see the result.", // <p>
      "h3.variables": "Variables", // <h3>
      "p.a0_k_a_max": "a0, k, a_max, b, decay d, inner-peace d₀, γ, δ, home targets and the main links. Design choices, not validated values.", // <p>
      "vars_reset": "Reset to defaults", // #vars-reset
      "v_grace_title": "Forgive & breathe", // #v-grace-title
      "tab_self": "Forgive myself", // #tab-self
      "tab_other": "Forgive someone", // #tab-other
      "tab_practice": "Breathe & be patient", // #tab-practice
      "p.optional_kept_only_on": "Optional. Kept only on this page unless you save it.", // <p>
      "button.back": "Back", // <button>
      "button.next_step": "Next step", // <button>
      "button.save_these_notes_to": "Save these notes to the journal", // <button>
      "p.optional_kept_only_on_2": "Optional. Kept only on this page unless you save it.", // <p>
      "button.back_2": "Back", // <button>
      "button.next_step_2": "Next step", // <button>
      "button.save_these_notes_to_2": "Save these notes to the journal", // <button>
      "span.mindfulness": "Mindfulness", // <span>
      "span.patience": "Patience", // <span>
      "span.body": "Body", // <span>
      "dump_go": "Start the 10-minute timer", // #dump-go
      "label.scratch_box_never_saved": "Scratch box (never saved unless you tap Save to journal)", // <label>
      "dump_letgo": "Let it go", // #dump-letgo
      "dump_save": "Save to journal", // #dump-save
      "p.it_clears_when_you": "It clears when you close this, tap Update, or tap Let it go.", // <p>
      "breath_phase": "Ready when you are: in for four, out for six.", // #breath-phase
      "breath_go": "Start the breathing circle", // #breath-go
      "p.no_sound_with_reduced": "No sound. With reduced motion on, the circle stays still and only the words and color change.", // <p>
      "v_movies_title": "Watch something", // #v-movies-title
      "mv_more": "More", // #mv-more
      "mv_online": "Find more online", // #mv-online
      "mv_send": "Send and look", // #mv-send
      "mv_cancel": "Cancel", // #mv-cancel
      "p.a_model_not_a": "A model, not a prescription: people often choose films to ease a hard mood or keep a good one (mood management theory, Zillmann, 1988). The films here are a small list kept in the app, so they work offline. Film facts from Wikidata (CC0).", // <p>
      "summary.use_my_own_tmdb": "Use my own TMDB key (optional, off)", // <summary>
      "label.tmdb_v3_api_key": "TMDB v3 API key", // <label>
      "mv_key_save": "Save key", // #mv-key-save
      "mv_key_clear": "Remove key", // #mv-key-clear
      "p.stored_only_in_this": "Stored only in this browser and never in your code. Sent only to api.themoviedb.org, and only when you tap Find more online, for posters and ratings. This product uses the TMDB API but is not endorsed or certified by TMDB.", // <p>
      "v_about_title": "About me", // #v-about-title
      "p.optional_it_shapes_the": "Optional. It shapes the steps, story pictures and suggestions in your own way. It is kept on this device and never sent.", // <p>
      "legend.hobbies": "Hobbies", // <legend>
      "label.other_interests_comma_separated": "Other interests (comma separated)", // <label>
      "label.field_of_study_or": "Field of study or work", // <label>
      "option.not_set": "Not set", // <option>
      "label.in_your_own_words": "In your own words (optional)", // <label>
      "ab_save": "Save", // #ab-save
      "ab_clear": "Clear", // #ab-clear
      "v_anchor_title": "Your anchor", // #v-anchor-title
      "gv_title": "Room to express", // #gv-title
      "gv_math": "Show the math", // #gv-math
      "an_review_title": "Evening review: your path as a story", // #an-review-title
      "an_save": "Save this story as a picture", // #an-save
      "h4.your_anchor_path": "Your anchor path", // <h4>
      "p.the_anchor_moves_with": "The anchor moves with you: it gathers the feelings you hope for with where you are. When you stay near it for a while, it steps to a new stone. “Collapse” is only a picture for that step, nothing quantum. The path is kept on this device and never sent.", // <p>
      "an_math": "Show the math", // #an-math
      "an_clear": "Clear path", // #an-clear
      "h4.time_constants_hours": "Time constants (hours)", // <h4>
      "v_credits_title": "Credits", // #v-credits-title
      "wi_title": "Where ideas come from", // #wi-title
      "wi_math": "Show the math", // #wi-math
      "p.a_model_built_from": "A model built from design assumptions and informed by research, not validated science and not a diagnosis.", // <p>
      "attr.aria_label.your_companion_open": "Your companion. Open", // aria-label
      "attr.aria_label.how_to_begin": "How to begin", // aria-label
      "attr.placeholder.what_s_on_your": "What's on your mind?", // placeholder
      "attr.placeholder.willow": "Willow", // placeholder
      "attr.aria_label.your_companion_open_2": "Your companion. Open", // aria-label
      "attr.aria_label.affirmations": "Affirmations", // aria-label
      "attr.aria_label.seeds_resting_in_water": "Seeds resting in water above a counter on a cornerstone; seed counter 0", // aria-label
      "attr.aria_label.back": "Back", // aria-label
      "attr.aria_label.close": "Close", // aria-label
      "attr.aria_label.growth": "Growth", // aria-label
      "attr.placeholder.paste_code_that_starts": "Paste code that starts with mf 4 (mf 3, mf 2 and mf 1 also work)", // placeholder
      "attr.aria_label.forgive_and_breathe": "Forgive and breathe", // aria-label
      "attr.placeholder.write_whatever_is_going": "Write whatever is going round. Nothing here is kept.", // placeholder
      "attr.aria_label.film_suggestions": "Film suggestions", // aria-label
      "attr.aria_label.before_anything_is_sent": "Before anything is sent", // aria-label
      "attr.placeholder.32_letters_and_numbers": "32 letters and numbers", // placeholder
      // mixed-content text runs (wrapped in <span data-t>)
      "text.in_crisis_call_or": "In crisis, call or text ",
      "text.us_practice_not_therapy": " (US) · practice, not therapy",
      "text.it_grows_as_you": " It grows as you take care of yourself. What would you like to call it?",
      "text.what_you_may_be": "What you may be feeling",
      "text.one_step": "One step",
      "text.how_they_connect": "How they connect",
      "text.seed_counter": "seed counter ",
      "text.affirmations": "Affirmations",
      "text.include_faith": " Include faith",
      "text.x": "←",
      "text.i_grow_when_you": "I grow when you check in, try a step, save to your journal, finish a practice, or come back another day. Hard days never make me smaller. ",
      "text.x_2": "›",
      "text.x_3": "›",
      "text.x_4": "›",
      "text.x_5": "›",
      "text.opens_in_a_new": "Opens in a new tab and copies the prompt too, in case the site doesn't fill it in. Grok may send it as soon as it opens. ",
    },

    // ===== app.js — the app shell: one text box (or the feelings picker), an Update button, the words-first =====
    "app": {
      // stale()
      "stale.numbers_changed_tap_update_to": "Numbers changed. Tap Update to see the new reading.",
      // crisis()
      "crisis.you_don_t_have_to": "<p><strong>You don't have to carry this alone.</strong> What you're feeling matters, and help is available right now.</p>\n        <p>Call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline, US, free, 24/7). If you're in immediate danger, call <strong>911</strong>.</p>\n        <p>Please also reach out to someone you trust.</p>",
      // renderCard()
      "renderCard.try_it_together": "Try it together: {{name}}",
      // setMore()
      "setMore.see_less": "See less",
      "setMore.see_more": "See more",
      // showView()
      "showView.your_companion": "your companion",
      "showView.back_to": "Back to {{v0}}",
      // module level
      "tap_update_to_refresh_the": "Tap Update to refresh the reading.",
      // copy()
      "copy.select_the_text_to_copy": "Select the text to copy it",
      "copy.select_the_text_to_copy_2": "Select the text to copy it.",
    },

    // ===== core/governor.js — the Expression governor (push27). =====
    "governor": {
      // module level
      "GRADES.words": "Keep writing. Say it as fully as you need.",
      "GRADES.words_2": "A slow-down pause: finish this thought, then take one slow breath before the next.",
      "GRADES.words_3": "Breathe and ground: Stop, Take a step back, Observe, then Proceed mindfully. Your words can wait a moment.",
      "GRADES.words_4": "It may help to step away for a while, and come back to this later. Nothing you wrote is lost.",
      "DOCTOR.racing_thoughts_or_short_sleep": "Racing thoughts or short sleep have come up on several days. It could help to talk with a doctor about it. This is not a diagnosis.",
      // govern()
      "govern.it_sounds_hard_to_feel": "It sounds hard to feel much right now. That's okay; noticing it is a first step.",
      "govern.irritation_seems_to_be_rising": "Irritation seems to be rising. A pause now can keep it from growing.",
      "govern.your_thoughts_may_be_moving": "Your thoughts may be moving fast. Slowing the pace can help them settle.",
      "govern.math.c_u_y_mn_race": "C {{v0}}, U {{v1}}, Y {{v2}}, Mn {{v3}} (race {{v4}}, sleep {{v5}}, press {{v6}}, burst {{v7}}, G {{v8}})",
      "govern.math.i_clip_i_e_u": "I = clip({{LEAK}}·I₋ + E) = {{v1}};  u = clip({{KP}}E + {{KI}}I) = {{v4}} → {{id}}",
      "govern.math.days_with_racing_or_short": "Days with racing or short sleep: {{v0}} (line at {{DAYS_DOCTOR}})",
      // module level
      "hide_the_math": "Hide the math",
      "show_the_math": "Show the math",
      // render()
      "render.kp_ki_leak_0": "Kp {{KP}}, Ki {{KI}}, leak {{LEAK}}, ℓ0 {{L0}}, κ {{KAPPA}}",
    },

    // ===== core/grounding.js — the Grounding Loop guide. =====
    "grounding": {
      // module level
      "LABELS.meaning": "Hidden-meaning story",
      "LABELS.fortuneTelling": "Predicting the future",
      "LABELS.mindReading": "Mind reading",
      "LABELS.allOrNothing": "Absolute words",
      "LABELS.labeling": "A harsh label",
      "LABELS.catastrophizing": "Expecting the worst",
      "LABELS.hopelessness": "Hopeless tone",
      "QUESTIONS.meaning": "What actually happened that you could show someone? What meaning did the thought add on top?",
      "QUESTIONS.fortuneTelling": "Do you know how this ends, or is the thought predicting? What is one other way it could go?",
      "QUESTIONS.mindReading": "What did they actually say or do? What else might they be thinking?",
      "QUESTIONS.allOrNothing": "Is it really {word}? Can you remember one time it went differently?",
      "QUESTIONS.labeling": "Would you call a friend that for the same thing? What did you do, rather than what are you?",
      "QUESTIONS.catastrophizing": "If it went badly, what would you do next? What is the most likely outcome, not the worst?",
      "QUESTIONS.hopelessness": "What is one thing, even small, that is still in your hands today?",
      "QUESTIONS.none": "What can you actually see, hear, or check right now?",
      "REFRAMES.meaning": [
        "Something hard happened, and that is real. The hidden meaning is a story the thought added, not something I can see.",
        "I am not being punished. I am going through something hard, and I am not alone in it.",
        "God's love isn't measured by how today went. I can still do one good thing.",
      ],
      "REFRAMES.fortuneTelling": [
        "I don't know how this will turn out yet. I can prepare for the next small step.",
      ],
      "REFRAMES.mindReading": [
        "I don't know what they think. I can ask, or I can let it be.",
      ],
      "REFRAMES.allOrNothing": [
        "Sometimes this happens, but not every time. There have been days it went differently.",
      ],
      "REFRAMES.labeling": [
        "I made a mistake. That is something I did, not who I am.",
      ],
      "REFRAMES.catastrophizing": [
        "This is hard, and it is probably not the worst case. I have handled hard things before.",
      ],
      "REFRAMES.hopelessness": [
        "Today feels heavy. Heavy is not the same as hopeless, and one small step still counts.",
      ],
      "REFRAMES.none": [
        "This is a thought, not a fact. One real thing I can do now is take a small step.",
        "I can notice this thought and still choose what I do next.",
      ],
      "ACTIONS.pray": "Pray for one minute: name the hard thing and ask for help with the next step",
      "ACTIONS.text": "Text a friend: \"Thinking of you. Got a minute?\"",
      "ACTIONS.walk": "Walk for five minutes and name three things you see",
      "ACTIONS.task": "Do one task that takes two minutes",
      "ACTIONS.ask": "Ask them one honest question",
      "ACTIONS.plan": "Write down the very next step, and nothing after it",
      "BIG_WORD.never": "it hasn't happened yet, and today is not the end of the story",
      "BIG_WORD.always": "it happens sometimes, and there have been times it didn't",
      "BIG_WORD.nothing": "some things are hard right now, and some things are still okay",
      "BIG_WORD.everyone": "some people may feel that way, and I don't know about the rest",
      "BIG_WORD.no_one": "it feels lonely right now, and that is not proof nobody cares",
      "BIG_WORD.completely": "part of this is hard, not all of it",
      // bigWordReframe()
      "bigWordReframe.is_a_big_word_truer": "\"{{cap}}\" is a big word. Truer: {{truer}}.",
    },

    // ===== core/kai.js — the Kai shield: steadiness under outside pressure (push23). =====
    "kai": {
      // module level
      "NAME.R": "respect guard",
      "FRUIT.F": "patience (forbearance)",
      "FRUIT.E": "kindness (empathy)",
      "FRUIT.R": "gentleness (the respect guard)",
      // hook()
      "hook.notes": [
        "outside criticism or judgment",
      ],
      // module level
      "JUDGED.label": "criticized or judged",
      // fn()
      "fn.notes": [
        "outside criticism or judgment",
      ],
      // module level
      "HOLDBACK.label": "holding back from reacting",
      // level()
      "level.just_starting": "just starting",
      // module level
      "STEP.A": "Self-awareness: name it to yourself, “I feel hurt, and I am still worth respect.”",
      "STEP.F": "Forbearance: before you answer, breathe out slowly three times, then decide what to say.",
      "STEP.E": "Empathy: ask yourself once, “What might they be carrying today?” Understanding isn't agreeing.",
      "STEP.R": "Respect guard: say, “I hear you. I see it differently, and I'm going to step away now.”",
      "SOURCE.A": "affect labeling: Lieberman et al., 2007; self-affirmation: Cohen & Sherman, 2014",
      "SOURCE.F": "patience: Schnitker, 2012",
      "SOURCE.E": "perspective taking: Davis, 1983",
      "SOURCE.R": "DEAR MAN and assertiveness: Linehan, 2015; Speed, Goldstein & Goldfried, 2018",
      // impulseLine()
      "impulseLine.urge_to_react_flickers_and": "{{pre}}{{v1}} urge to react flickers and fails; it can't break your balance.",
      "impulseLine.urge_to_react_is_there": "{{pre}}{{v1}} urge to react is there, and your shield is holding.",
      "impulseLine.urge_to_react_is_strong": "{{pre}}{{v1}} urge to react is strong right now. Steady first; you can answer later.",
      // cardLines()
      "cardLines.out.your_steadiness": "Your steadiness: {{v0}}.",
      "cardLines.out.the_weakest_part_of_the": "The weakest part of the shield is {{v0}}; it can grow. {{v1}}",
      "cardLines.with_faith_these_are_fruits": "With faith: these are fruits of the Spirit, and steadiness can rest in Christ, who gives rest to the weary (from Galatians and Matthew). Same numbers, faith words.",
      // mathLines()
      "mathLines.kai_shield_outside_pressure_x": "Kai shield (outside pressure): X = {{v0}} (k = {{kX}} to-me cues; by me: {{v2}})",
      "mathLines.e_1_1_c_e": "  E = 1 − (1 − c_E)(1 − ½σ_E) = {{v0}}   R = (1 − c_attack)·[1 − (1 − c_R)(1 − ½σ_R)] = {{v1}}   (each ≤ {{V_MAX}})",
      "mathLines.s_1_1_a_1": "  S = 1 − (1 − A)(1 − F)(1 − E)(1 − R) = {{v0}};  X(1 − S) = {{v1}};  push = X(1 − S)·w, w = {anger {{anger}}, shame {{shame}}, fear {{fear}}} → +{{v5}}, +{{v6}}, +{{v7}}",
      "mathLines.i_x_1_s_u": "  I = X(1 − S)·u = {{v0}} (u = {{v1}}; flickers and fails below {{FLICKER}});  lever = weakest virtue: {{v3}}",
      // story()
      "story.lines.A.strong": "With a deep breath, {{who}} anchored in self-awareness, naming what he felt and remembering his own worth.",
      "story.lines.A.growing": "With a deep breath, {{who}} began to name what he felt, and to remember that his worth was still his.",
      "story.lines.A.just_starting": "{{who}} took one breath and tried a first small sentence of self-awareness: “I feel hurt, and I am still worth respect.”",
      "story.lines.F.strong": "He applied forbearance, holding back the urge to argue.",
      "story.lines.F.growing": "The urge to argue tugged at him; forbearance let one slow breath go first.",
      "story.lines.F.just_starting": "Forbearance was only a seed today, so he paused for one breath before answering.",
      "story.lines.E.strong": "With empathy he saw the pain behind the villagers' words.",
      "story.lines.E.growing": "He wondered, with growing empathy, what the villagers might be carrying.",
      "story.lines.E.just_starting": "Empathy was just starting; he asked himself once what they might be carrying.",
      "story.lines.R.strong": "His respect guard shone like a shield, blocking the barbs of judgment without harming anyone.",
      "story.lines.R.growing": "His respect guard was growing, a shield he could lift: “I hear you. I see it differently.”",
      "story.lines.R.just_starting": "His respect guard was just starting, so he practiced one calm sentence: “I hear you. I see it differently, and I'm going to step away now.”",
      "story.sentences.faced_a_storm_of_words": "{{who}} faced a storm of words in the village square.",
      "story.his_small_friend_stayed_close": "{{friend}}, his small friend, stayed close beside him.",
      "story.impulsive_reaction_flickered_and_failed": "Impulsive reaction flickered and failed, unable to break his balance.",
      "story.impulsive_reaction_flickered_and_the": "Impulsive reaction flickered, and the shield held.",
      "story.impulsive_reaction_pushed_hard_so": "Impulsive reaction pushed hard, so he stepped back to steady himself first; that was strength too.",
      "story.stood_unmoved_a_calm_center": "{{who}} stood unmoved, a calm center of peace in the storm.",
      "story.his_was_the_part_still": "His {{v0}} was the part still growing, and that was all right; it grows a little each time he practices.",
      "story.remembered_jesus_before_his_accusers": "{{who}} remembered Jesus before his accusers, who answered nothing, like a sheep that is silent before its shearers (from Matthew and Isaiah); when he was cursed, he didn't curse back (from First Peter), and he prayed, “Father, forgive them” (from Luke). Patience, kindness, gentleness and self-control are fruits of the Spirit (from Galatians).",
      "story.A": "What is one true sentence about your worth you could keep today?",
      "story.F": "Where could one slow breath fit before you answer?",
      "story.E": "What might they be carrying that you can't see?",
      "story.R": "What is one calm sentence your respect guard could say today?",
    },

    // ===== core/master.js — THE MASTER FUNCTION. Every feature calls master(); nothing =====
    "master": {
      // module level
      "SKILL.fear": "Paced breathing: breathe out longer than in, five times, then name one thing you can see.",
      "SKILL.sadness": "One small action: do one thing you used to enjoy, for ten minutes.",
      "SKILL.anger": "Pause: step away for ten minutes, then name what matters to you here.",
      "SKILL.shame": "Self-compassion: say to yourself what you'd say to a friend, and tell one safe person.",
      "SKILL.rumination": "Worry window: give the replay ten minutes later today, then turn to one task now.",
      "SKILL.avoidance": "Approach: do two minutes of the thing you've been putting off.",
      "SKILL.calm": "Paced breathing: breathe out longer than in, five times.",
      "SKILL.connection": "Reach out: send one short message to someone kind.",
      "SKILL.hope": "One small plan: write down one thing for tomorrow.",
      "REFRAME.fear": "A fear is a guess about the future, not a fact.",
      "REFRAME.sadness": "This heavy feeling is real, and it can change.",
      "REFRAME.anger": "My anger is telling me something matters; I can choose what to do with it.",
      "REFRAME.shame": "I am a person having a hard moment, not a bad person.",
      "REFRAME.rumination": "Replaying it again won't change it; one next step might.",
      "REFRAME.avoidance": "I don't have to feel ready to take one small step.",
      "REFRAME.none": "This is a feeling, not a fact.",
      // act()
      "act.action.keep_going_notice_one_good": "Keep going: notice one good thing and stay with it for a breath.",
      // recText()
      "recText.step_day": "~{{steps}} step{{v1}} (~{{days}} day{{v3}})",
      "recText.not_reached_in_steps": "not reached in {{MAX_SIM}} steps",
      // module level
      "ONE_PAGE": [
        "(1) e = clip01(e₋ ⊕ n(text) + X·(1 − S)·w)   the reading",
        "(2) e' = clip01(e + a(e)·(h − e) + b·s(e))   the step",
        "(3) P = P_d(e)·(1 − γC)·(1 − δG);  lever = argmax ΔP_i;  step = practice(lever)",
        "(4) words = compose(e, e', P, lever, passes)",
      ],
      "FAITH_HOME.rest_and_peace_in_christ": "rest and peace in Christ (Matthew 11:28–30; Philippians 4:7).",
    },

    // ===== core/movers.js — the nine movers and how words become numbers. =====
    "movers": {
      // module level
      "VAR_SPEC.a0_base_step_size_toward": "a0: base step size toward home",
      "VAR_SPEC.k_how_much_distance_from": "k: how much distance from home adds to the step",
      "VAR_SPEC.a_max_largest_step": "a_max: largest step",
      "VAR_SPEC.stabilizer_pull_grounding_movers_press": "stabilizer pull (grounding movers press on hard ones)",
      "VAR_SPEC.decay_how_fast_a_mover": "decay: how fast a mover settles on its own",
      "VAR_SPEC.d0_distance_at_which_inner": "d0: distance at which inner peace is half",
      "VAR_SPEC.how_much_the_strongest_hidden": "γ: how much the strongest hidden pull lowers peace",
      "VAR_SPEC.how_much_grand_or_absolute": "δ: how much grand or absolute thinking lowers peace",
      "not_a_number_kept": "{{k}}: not a number, kept {{v1}}",
      "kept_inside": "{{k}}: kept inside {{min}}–{{max}}",
      // validateVars()
      "validateVars.amax_raised_to_fit_abase": "aMax: raised to fit aBase",
      // fromText()
      "fromText.hopeless_wording": "hopeless wording",
      "fromText.worry_wording": "worry wording",
      "fromText.anger_wording": "anger wording",
      "fromText.hidden_meaning_curse_sign_language": "hidden-meaning (curse/sign) language",
      "fromText.harsh_label": "harsh label",
      "fromText.mind_reading": "mind reading",
      "fromText.absolute_words": "absolute words",
      // module level
      "PICK_WORD.rumination": "replaying thoughts",
    },

    // ===== core/reality.js — hidden conflicts, true-sized thinking (not grandiose, not =====
    "reality": {
      // hook()
      "hook.notes": [
        "grand or absolute wording",
      ],
      "hook.putting_yourself_down": "putting yourself down",
      "hook.mixed_feelings_in_the_words": "mixed feelings in the words",
    },

    // ===== core/topology.js — the layered topology, time, resistance and the moving anchor (push27). =====
    "topology": {
      // module level
      "VARS.where_you_were": "where you were",
      "VARS.what_the_words_add": "what the words add",
      "VARS.the_stepped_vector": "the stepped vector",
      "VARS.step_size_a_e": "step size a(e)",
      "VARS.base_step": "base step",
      "VARS.distance_gain": "distance gain",
      "VARS.largest_step": "largest step",
      "VARS.step_when_feeding": "step when feeding",
      "VARS.stabilizer_pull": "stabilizer pull",
      "VARS.stabilizer_when_feeding": "stabilizer when feeding",
      "VARS.grounding_pressure_s_e": "grounding pressure s(e)",
      "VARS.who_amplifies_whom": "who amplifies whom",
      "VARS.growth_rate_w_a_d": "growth rate ρ(W_A) − d",
      "kai_shield": "Kai shield",
      "time_and_resistance": "time and resistance",
      "past_to_future": "past to future",
      "freeing_mix": "freeing mix",
      "moving_anchor": "moving anchor",
      "scripture_seed_wording_only": "scripture seed (wording only)",
      "companion_growth_caring_actions_only": "companion growth (caring actions only)",
      "LAYERS.2": "Steadiness (virtues and shield)",
      "LAYERS.3": "Peace, conflict and true size",
      "LAYERS.4": "Grip, time and resistance",
      "LAYERS.5": "Past to future and hope",
      "LAYERS.6": "Faith and meaning (wording only)",
      "VL.verduyn_lavrijsen_2015_motiv_emot": "Verduyn & Lavrijsen, 2015, Motiv Emot 39(1):119–127",
      "TAU.fear.src": "{{VL}}: fear is among the shortest emotions (and shorter than anxiety)",
      "TAU.sadness.src": "{{VL}}: sadness lasts longest (about 120 hours on average to a lasting return)",
      "TAU.anger.src": "{{VL}}: irritation is short; longer forms such as hatred last days",
      "TAU.shame.src": "{{VL}}: shame is the shortest on average (about half an hour); guilt lasts longer",
      "TAU.calm.src": "design choice (no duration data for the grounding movers)",
      "TAU.rumination.src": "design choice; rumination prolongs emotions ({{VL}}; Verduyn et al., 2009, Emotion 9(1):83–91)",
      "TAU.avoidance.src": "design choice; avoidance keeps feelings going (see ρ)",
      "OMITTED.the_popular_90_second_rule": "The popular \"90-second\" rule for an emotion's chemical wave (Bolte Taylor, My Stroke of Insight, 2008) is not peer-reviewed and is not used here.",
      "PATIENCE.fear": "Fear often eases in minutes to hours.",
      "PATIENCE.shame": "Shame often passes within the hour, though guilt can stay longer.",
      "PATIENCE.anger": "Irritation often eases within hours; deeper anger can take days.",
      "PATIENCE.sadness": "Sadness can take days. Be patient with yourself.",
      "PATIENCE.rumination": "Replaying keeps feelings around longer; each gentle return to now helps.",
      "PATIENCE.avoidance": "Feelings we push away tend to stay longer.",
      // span()
      "span.a_few_hours": "a few hours",
      "span.about_a_day": "about a day",
      "span.a_few_days": "a few days",
      "span.a_week_or_more": "a week or more",
      // lvl()
      "lvl.a_lot_of": "a lot of",
      // anchorWords()
      "anchorWords.with_easing": ", with {{v0}} easing",
      // module level
      "FAITH.with_faith_the_anchor_is": "With faith, the anchor is rest in Christ: “{{v0}}” (Hebrews 6:19, WEB). This changes the words, not the math.",
      "LAYER_WORD.1": "your feelings",
      "LAYER_WORD.2": "outside pressure",
      "LAYER_WORD.3": "inner peace and mixed pulls",
      "LAYER_WORD.4": "the grip, and resistance",
      "LAYER_WORD.5": "the past and hope",
      // view()
      "view.words.some_way_from": "some way from",
      "view.words.far_from": "far from",
      "view.words.you_are_your_anchor": "You are {{far_s}} your anchor: {{v1}}.",
      "view.words.what_pulls_most_right_now": "What pulls most right now: {{v0}}.",
      "view.a_rough_guess_to_feel": "A rough guess to feel near your anchor: from {{v0}} to {{v1}}. It is a wide guess, not a promise.",
      "view.you_are_already_close_to": "You are already close to your anchor. Stay with it for a while.",
      "view.why.pushing_the_feeling_away": "pushing the feeling away",
      "view.why.replaying_it": "replaying it",
      "view.why.avoiding_it": "avoiding it",
      "view.some_resistance_is_here_fighting": "Some resistance is here ({{why}}). Fighting a feeling can keep it around longer. A willingness step: make a little room for it and say, “I'm willing to feel this for one breath.”",
      "view.math.e_a_k_in_out": "‖e − A_k‖ = {{v0}};  ε_in = {{EPS_IN}}, ε_out = {{EPS_OUT}};  τ_dwell = {{v3}} h",
      "view.math.layer_pull_rms": "Layer pull (RMS): {{v0}}",
      "view.math.avoid_suppress_rumination_inertia_sustain": "ρ = {{v0}} (avoid {{v1}}, suppress {{v2}}, rumination {{v3}}, inertia {{v4}}, sustain {{v5}}, willing {{v6}})",
      "view.math.eff_1_e_rum_1": "τeff = τ(1 + e_rum)/(1 − ρ): {{v0}}",
      "view.math.time_to_within_0_1": "Time to within 0.1 per mover: {{v0}}–{{v1}} h (typical {{v2}} h)",
      "view.math.k_1_h_q_master": "k(1 h) = {{v0}};  q (master, toward h) = {{v1}};  q_ρ = {{v2}};  q_A = {{v3}}, radius {{v4}}",
      // review()
      "review.out.today_the_traveler_set_out": "Today the traveler set out with the fawn, looking for {{v0}}.",
      // module level
      "after_a_while": "After a while",
      "she_stepped_to_a_new": "{{v0}} she stepped to a new stone: {{v1}}.",
      // review()
      "review.each_stone_held_long_enough": "Each stone held long enough for the next one to appear.",
      "review.she_stayed_by_that_stone": "She stayed by that stone, and it was enough for today.",
      "review.hebrews_6_19_web": "“{{v0}}” (Hebrews 6:19, WEB).",
      // module level
      "saved_the_story_as_a": "Saved the story as a picture on this device.",
      // render()
      "render.tap_update_first_and_i": "Tap Update first, and I'll show how far you are from your anchor.",
    },

    // ===== core/words.js — THE COMPOSER: every sentence on the card is built from the =====
    "words": {
      // module level
      "FEEL.rumination": "caught in replaying thoughts",
      "FEEL.avoidance": "pulled to avoid things",
      "NOUN.rumination": "the replaying",
      "SOFTENER.calm": "slowing down",
      "LINK_VERB.up.mid": [
        "stirs up",
        "adds to",
      ],
      "LINK_VERB.up.weak": [
        "nudges up",
        "can add a little to",
      ],
      "LINK_VERB.down.strong": [
        "wears down",
        "drains",
      ],
      "LINK_VERB.down.mid": [
        "dims",
        "chips away at",
      ],
      "LINK_VERB.down.weak": [
        "can dim",
        "can wear on",
      ],
      "LINK_VERB.soft.mid": [
        "can soften",
        "takes the edge off",
      ],
      "LINK_VERB.soft.weak": [
        "can ease a little",
      ],
      "EASE.anger": [
        "loosen its grip",
        "loosens its grip",
        "loosened its grip",
      ],
      "EASE.shame": [
        "grow quieter",
        "grows quieter",
        "grew quieter",
      ],
      "EASE.sadness": [
        "grow lighter",
        "grows lighter",
        "grew lighter",
      ],
      "EASE.rumination": [
        "slow down",
        "slows down",
        "slowed",
      ],
      "EASE.calm": [
        "come back",
        "comes back",
        "came back",
      ],
      "EASE.hope": [
        "come back",
        "comes back",
        "came back",
      ],
      "ACT.fear": "take one safe step",
      "ACT.sadness": "do one small kind thing for myself",
      "ACT.anger": "choose how I respond",
      "ACT.shame": "treat myself the way I'd treat a friend",
      "ACT.rumination": "set this thought down for now",
      "ACT.avoidance": "face one small piece of this",
      "ACT.calm": "slow my breath",
      "ACT.connection": "let one person in a little",
      "ACT.hope": "plan one small thing",
      "LOW_STATE.connection": "you feel alone",
      "LOW_STATE.calm": "you're restless",
      "LOW_STATE.hope": "hope runs low",
      "LOW_FIX.connection": "reaching toward one person",
      "LOW_FIX.calm": "slowing your breath",
      "LOW_FIX.hope": "one small plan",
      // feelingLine()
      "feelingLine.you_may_be_feeling": "You may be feeling {{v0}}.",
      "feelingLine.you_may_be_feeling_2": "You may be feeling {{v0}}.",
      "feelingLine.nothing_strong_stands_out_right": "Nothing strong stands out right now; you may be feeling fairly even.",
      // roomLine()
      "roomLine.room_for": "Room for: {{v0}}{{as}}.",
      // connectLines()
      "connectLines.soft.one_small_step_can_soften": "one small step can soften it",
      "connectLines.when_is_it": "When {{v0}} is {{size}}, it {{verb}} {{v3}}{{v4}}; {{soft}}.",
      "connectLines.is_the_part_right_now": "{{v0}} is the {{v1}} part right now; {{soft}}.",
      "connectLines.v": [
        "keep feeding each other",
        "keep each other going",
      ],
      "connectLines.v_2": [
        "nudge each other",
        "stir each other a little",
      ],
      "connectLines.when_grow_more_easily_it": "When {{v0}}, {{v1}} grow more easily; {{v2}} {{verb}} it.",
      "connectLines": [
        "building on",
        "feeding",
      ],
      "connectLines.these_feelings_are_each_other": "These feelings are {{v0}} each other right now, so go gently.",
      "connectLines.these_feelings_tend_to_ease": "These feelings tend to ease on their own.",
      "connectLines.these_feelings_tend_to_ease_2": "These feelings tend to ease on their own, slowly.",
      "connectLines.creep.avoidance": "the urge to avoid things",
      "connectLines_2": [
        "may grow",
        "may rise",
      ],
      "connectLines_3": [
        "may creep in",
        "may slip in",
      ],
      "connectLines.if_this_stays_unspoken": "If this stays unspoken, {{creep}} {{v1}}.",
      "connectLines.nothing_is_pulling_hard_on": "Nothing is pulling hard on anything else right now.",
      // fear()
      "fear.is_afraid_of_what_could": "is {{l}} afraid of what could go wrong",
      // anger()
      "anger.is_angry": "is {{l}} angry",
      // shame()
      "shame.wants_to_hide": "{{v0}}wants to hide",
      // rumination()
      "rumination.again_and_again": " again and again",
      "rumination.keeps_going_over_it": "keeps going over it{{v0}}",
      // avoidance()
      "avoidance.wants_to_pull_back": "{{v0}}wants to pull back",
      // module level
      "PULL_B.fear_hope": "is hoping it goes well",
      "PULL_B.anger_connection": "wants to stay close",
      "PULL_B.shame_connection": "needs to be close to someone",
      "PULL_B.rumination_calm": "wants some peace",
      "PULL_B.avoidance_hope": "hopes to move forward",
      "TEXT_PULL.wantBut": [
        "wants something",
        "is holding back",
      ],
      "TEXT_PULL.shouldBut": [
        "knows what it would like to do",
        "isn't ready yet",
      ],
      "TEXT_PULL.loveBut": [
        "cares deeply",
        "is hurt or unsure",
      ],
      "TEXT_PULL.partOfMe": [
        "feels one way",
        "feels another",
      ],
      // pulls()
      "pulls.is_really": "is really ",
      // conflictLines()
      "conflictLines.hold": [
        "Feeling both is a normal part of change; you can hold both and still take one small step.",
        "Being pulled both ways is a normal part of change; you can hold both and still choose one small step.",
      ],
      "conflictLines.hold_2": [
        "It's normal to feel two ways at once; you don't have to settle it today.",
        "Mixed feelings are normal; you can let both be here for now.",
      ],
      "conflictLines.a_hidden_pull_part_of": "A hidden pull: part of you {{a}}, while part of you {{b}}.",
      // module level
      "CLAIM.grand": "it all depends on you, or that you can't fall short",
      "CLAIM.catastrophic": "the worst will happen",
      "CLAIM.allOrNothing": "it's all or nothing",
      "CLAIM.absolutist": "it is always or never this way",
      "TRUE_SIZE.grand": "You matter, and you are also human; one good step is enough.",
      "TRUE_SIZE.catastrophic": "The ending isn't written yet; you can handle the next hour, and that is enough.",
      "TRUE_SIZE.allOrNothing": "Partly done and partly good still counts.",
      "TRUE_SIZE.absolutist": "Some of the time, with some people, is usually closer to true.",
      "SMALL_CLAIM.worthless": "you are worth nothing",
      "SMALL_CLAIM.undeserving": "you don't deserve good things",
      "SMALL_CLAIM.disqualify": "what went well was only luck",
      "SMALL_CLAIM.compare": "everyone is better than you",
      "SMALL_TRUE.worthless": "Not bigger, not smaller: you are a person with real worth, having a hard time.",
      "SMALL_TRUE.undeserving": "Not bigger, not smaller: kindness isn't a prize you earn; you can receive it while you keep learning.",
      "SMALL_TRUE.disqualify": "Not bigger, not smaller: what went well counts too; you can name your part in it plainly.",
      "SMALL_TRUE.compare": "Not bigger, not smaller: you are not worse than others, and you don't need to be better.",
      "SMALL_TRUE.chip": "Not bigger, not smaller: you can name what went wrong and what went right, both at their real size.",
      "SURE.strongly": "very sure",
      "SURE.a_little": "a bit sure",
      // realityLines()
      "realityLines.and_that": ", and that ",
      "realityLines.reality_check_part_of_this": "Reality check: part of this thought sounds {{v0}} that {{v1}}.",
      "realityLines.reality_check_part_of_this_2": "Reality check: part of this thought sounds {{v0}} that {{v1}}. That is smaller than true.",
      "realityLines.reality_check_you_marked_putting": "Reality check: you marked putting yourself down. That voice makes you sound smaller than you are.",
      // module level
      "i_can_feel_and_still": "I can feel {{v0}} and still {{act}}.",
      "even_when_i_feel_this": "Even when I feel this {{v0}}, I can {{act}}.",
      "is_here_and_i_can": "{{v0}} is here, and I can {{act}}.",
      "i_can_make_room_for": "I can make room for {{v0}} and {{act}}.",
      "i_notice_a_little_i": "I notice a little {{v0}}; I can {{act}}.",
      "this_is_small_enough_to": "This is small enough to hold, and I can {{act}}.",
      // affirmations()
      "affirmations.there_is_room_for_here": "There is room for {{word}} here, even now.",
      "affirmations.i_can_make_a_little": "I can make a little room for {{word}} today.",
      "affirmations.part_of_me_and_part": "Part of me {{a}}, and part of me {{b}}; I can hold both.",
      "affirmations.i_matter_and_i_am": "I matter, and I am human; one good step is enough.",
      "affirmations.i_don_t_know_the": "I don't know the ending yet, and I can handle the next hour.",
      "affirmations.some_of_the_time_is": "Some of the time is not all of the time.",
      "affirmations.span.this_hard_day": "this hard day",
      "affirmations.span.the_next_hour": "the next hour",
      "affirmations.span.this_moment": "this moment",
      "affirmations.god_can_give_me_for": "God can give me {{v0}} for {{span}}.",
      "affirmations.i_can_bring_this_to": "I can bring this {{v0}} to God and ask for {{v1}}.",
      // fear()
      "fear.breathe_out_longer_than_in": "breathe out longer than in, {{times}} times, then name one thing you can see",
      // sadness()
      "sadness.do_one_thing_you_used": "do one thing you used to enjoy, for {{min}} minutes",
      // anger()
      "anger.pause_step_away_for_minutes": "pause: step away for {{min}} minutes, then name what matters to you here",
      // shame()
      "shame.say_to_yourself_what_you": "say to yourself what you'd say to a friend, then tell one safe person",
      // rumination()
      "rumination.give_the_replay_minutes_later": "give the replay {{min}} minutes later today, then turn to one task now",
      // avoidance()
      "avoidance.do_minutes_of_the_thing": "do {{min}} minutes of the thing you've been putting off",
      // calm()
      "calm.breathe_out_longer_than_in": "breathe out longer than in, {{times}} times",
      // connection()
      "connection.send_one_short_message_to": "send one short message to someone kind",
      // hope()
      "hope.write_down_one_small_thing": "write down one small thing for tomorrow",
      // stepLine()
      "stepLine.so_can": "{{v0}}, so {{v1}} can {{v2}}{{g_s}}.",
      // module level
      "LEVER_NOUN.fear": "the fear",
      "LEVER_NOUN.sadness": "the sadness",
      "LEVER_NOUN.anger": "the anger",
      "LEVER_NOUN.shame": "the shame",
      "PEACE_TAIL.a_little": [
        ", for now.",
        ", and it can grow.",
      ],
      "PEACE_TAIL.growing": [
        ", little by little.",
        ", and gently rising.",
      ],
      "PEACE_TAIL.close": [
        ", nearly there.",
        ", within reach.",
      ],
      // peaceLines()
      "peaceLines.out.inner_peace": "Inner peace: {{b}}{{b_s}}",
      "peaceLines.lv.keeping_things_gentle": "keeping things gentle",
      "peaceLines.path_to_peace_you_re": "Path to peace: you're there right now; the biggest help is {{lv}}.",
      "peaceLines.path_to_peace_about_gentle": "Path to peace: about {{v0}} gentle step{{v1}}; the biggest help right now is {{lv}}.",
      "peaceLines.path_to_peace_this_may": "Path to peace: this may take longer, and you don't have to do it alone; the biggest help right now is {{lv}}.",
      "peaceLines.the_hidden_pull_takes_of": "The hidden pull takes {{v0}} of your peace; holding both parts kindly gives it back.",
      "peaceLines.putting_yourself_down_takes_too": "Putting yourself down takes {{v0}} too; seeing yourself at your true size makes room for peace.",
      "peaceLines.the_grand_thought_takes_too": "The grand thought takes {{v0}} too; seeing it at its true size makes room for peace.",
      // module level
      "PEACE_FAITH.may_the_peace_of_god": "May the peace of God, which surpasses all understanding, guard your heart and mind (from Philippians).",
      // howMany()
      "howMany.one_or_two": "one or two",
      // progressLine()
      "progressLine.this_is_your_first_check": "This is your first check-in here, so there's nothing to compare yet.",
      "progressLine.you_re_about_where_you": "You're about where you've been lately.",
      "progressLine.you_re_closer_to_steady": "You're {{deg}} closer to steady than your recent days.",
      "progressLine.you_re_further_from_steady": "You're {{deg}} further from steady than your recent days; one small step is enough.",
      "progressLine.you_re_close_to_steady": "You're close to steady right now.",
      "progressLine.this_may_take_time_and": "This may take time, and you don't have to do it alone.",
      "progressLine.small_step_could_bring_you": "{{v0}} small step{{v1}} could bring you close to steady.",
      // headline()
      "headline.room.room_for": "Room for ",
      // lines()
      "lines.what_you_may_be_feeling": "What you may be feeling: {{v0}}",
      "lines.how_they_connect": "How they connect: {{v0}}",
      "lines.one_step": "One step: {{step}}",
    },

    // ===== features/about.js — "About me" (optional, push27): hobbies and field of study or work. =====
    "about": {
      // module level
      "HOBBIES.coding.step": "Rubber-duck your feeling: explain it out loud, step by step, as if to a patient friend.",
      "HOBBIES.coding.kind": "Help someone with one small question, or leave one kind comment on their work.",
      "HOBBIES.coding.flow": "solving one small problem",
      "HOBBIES.music.step": "Play or listen to one song slowly, all the way through, and notice one instrument.",
      "HOBBIES.music.kind": "Share one calm song with someone you like.",
      "HOBBIES.music.flow": "playing or listening closely",
      "HOBBIES.sports.step": "A brisk ten-minute walk, or a few easy drills at half speed.",
      "HOBBIES.sports.kind": "Invite someone for an easy walk or a few gentle drills together.",
      "HOBBIES.sports.flow": "moving with a steady rhythm",
      "HOBBIES.reading.step": "Read one page slowly, then write one line you want to remember.",
      "HOBBIES.reading.kind": "Send a friend one line you liked, and why.",
      "HOBBIES.reading.flow": "getting lost in a good page",
      "HOBBIES.writing.step": "Write five honest sentences, then stop and breathe.",
      "HOBBIES.writing.kind": "Write a short thank-you note to someone.",
      "HOBBIES.writing.flow": "finding the right words",
      "HOBBIES.art.label": "Art and drawing",
      "HOBBIES.art.step": "Draw one ordinary object for ten minutes, just its outline.",
      "HOBBIES.art.kind": "Make a small sketch for someone and give it to them.",
      "HOBBIES.art.flow": "a line following your hand",
      "HOBBIES.cooking.step": "Make something simple, one step at a time, tasting as you go.",
      "HOBBIES.cooking.kind": "Cook something simple and share it.",
      "HOBBIES.cooking.flow": "the rhythm of chopping and stirring",
      "HOBBIES.gardening.label": "Gardening and nature",
      "HOBBIES.gardening.step": "Water a plant or step outside and touch one leaf.",
      "HOBBIES.gardening.kind": "Give someone a cutting, or water a neighbor's plants.",
      "HOBBIES.gardening.flow": "hands in the soil",
      "HOBBIES.gaming.step": "Play one calm game for a set fifteen minutes, then stand and stretch.",
      "HOBBIES.gaming.kind": "Play a calm co-op game with a friend, for a set time.",
      "HOBBIES.gaming.flow": "a game that is just hard enough",
      "HOBBIES.films.label": "Films and shows",
      "HOBBIES.films.step": "Watch one short gentle scene and notice what helped the character.",
      "HOBBIES.films.kind": "Ask someone to watch something gentle with you.",
      "HOBBIES.films.flow": "a story that holds your attention",
      "HOBBIES.faith.label": "Faith and service",
      "HOBBIES.faith.step": "Sit quietly for a minute, then do one small act of service.",
      "HOBBIES.faith.kind": "Do one small act of service for someone nearby.",
      "HOBBIES.faith.flow": "quiet, steady service",
      "HOBBIES.crafts.label": "Crafts and making",
      "HOBBIES.crafts.step": "Work on one small piece for ten minutes with your hands.",
      "HOBBIES.crafts.kind": "Make or fix one small thing for someone.",
      "HOBBIES.crafts.flow": "careful work with your hands",
      "FIELDS.software.label": "Software development",
      "FIELDS.software.metaphor": "the way she would step through code, one line at a time, without blaming herself for the bug",
      "FIELDS.nursing.label": "Nursing and care",
      "FIELDS.nursing.metaphor": "the way she would care for a patient, gently and without hurry",
      "FIELDS.art.label": "Art and design",
      "FIELDS.art.metaphor": "the way a painter lets a first layer dry before the next",
      "FIELDS.teaching.label": "Teaching and study",
      "FIELDS.teaching.metaphor": "the way a good teacher lets a student try again",
      "FIELDS.science.label": "Science and research",
      "FIELDS.science.metaphor": "the way a careful scientist treats a thought as a question to test",
      "FIELDS.trades.label": "Trades and building",
      "FIELDS.trades.metaphor": "the way a builder checks the level before the next row",
      "FIELDS.business.label": "Business and office",
      "FIELDS.business.metaphor": "the way she would clear one task before opening the next",
      "FIELDS.health.label": "Health and medicine",
      "FIELDS.health.metaphor": "the way a clinician listens before deciding",
      "FIELDS.student.metaphor": "the way a student reads one paragraph at a time",
      "FIELDS.other.label": "Something else",
      "FIELDS.other.metaphor": "the way small steady work grows over time",
      // step()
      "step.a_step_in_your_own": "A step in your own way: {{step}}",
      // flowWords()
      "flowWords.your_anchor_has_room_for": "Your anchor has room for flow: the absorbed calm of {{v0}}.",
      // module level
      "should_look_like_hobbies_music": "“{{tok}}” should look like hobbies=music,coding or field=software.",
      "an_about_value_can_t": "an about value can't be read.",
      "saved_on_this_device_it": "Saved on this device. It is never sent.",
    },

    // ===== features/analyzer.js — "Look closer" (was Remy the Raccoon, the Analyzer). =====
    "analyzer": {
      // module level
      "GROUP.hard": "a hard feeling",
      "GROUP.grounding": "a grounding strength",
      "GROUP.process": "a thinking habit",
      "HIGH.connection": "close to people",
      // level()
      "level.in_the_middle": "in the middle",
      "level.quiet_right_now": "quiet right now",
      // module level
      "helps_soften": "Helps soften {{v0}}.",
      "steadies_you_in_the_background": "Steadies you in the background.",
      "it_can_feed": "It can feed {{v0}}.",
      "it_mostly_moves_on_its": "It mostly moves on its own.",
      // pullSize()
      "pullSize.a_strong_pull": "a strong pull",
      "pullSize.a_clear_pull": "a clear pull",
      "pullSize.a_gentle_pull": "a gentle pull",
      // module level
      "KIND_WORDS.grand": "big, everything-on-me wording",
      "KIND_WORDS.absolutist": "always/never wording",
      "in_your_words": ", in your words",
      "hidden_pull_part_of_you": "Hidden pull ({{v0}}{{v1}}): part of you {{a}}, while part of you {{b}}.",
      // details()
      "details.grand_or_absolute_wording_present": "Grand or absolute wording: {{v0}} present ({{v1}}). It adds to the replaying and to believing the thought word for word.",
      "details.you_marked_it_in_the": "you marked it in the feelings picker",
      "details.present_in_the_wording": "present in the wording",
      "details.putting_yourself_down_it_adds": "Putting yourself down: {{v0}}. It adds to the shame and dims hope.",
      "details.self_blame_wording_present_it": "Self-blame wording: {{v0}} present. It adds to the shame and the replaying.",
      "details.resentment_toward_someone_present_it": "Resentment toward someone: {{v0}} present. It adds to the anger and the replaying, and dims connection.",
      "details.no_hidden_pulls_grand_wording": "No hidden pulls, grand wording or put-downs stand out right now.",
      // render()
      "render.tap_update_to_see_each": "Tap Update to see each mover.",
      // module level
      "quiet_small": "quiet small",
    },

    // ===== features/companion.js — your companion: a little fawn that grows with you. =====
    "companion": {
      // module level
      "RULES.update.word": "checking in",
      "RULES.step.word": "trying a step",
      "RULES.journal.word": "a journal save",
      "RULES.practice.word": "finishing a practice",
      "RULES.day.word": "coming back",
      "OPEN.rest": [
        "I'm resting right here beside you.",
        "I'm curled up close to you.",
      ],
      "OPEN.near": [
        "I'm staying close to you.",
        "I'm right here, close by.",
      ],
      "OPEN.breathe": [
        "I'm here with you, breathing slowly.",
        "I'm here with you.",
      ],
      "OPEN.tuck": [
        "I'm here with you, just as you are.",
        "I'm on your side.",
      ],
      "OPEN.watch": [
        "I'm here with you, watching the thoughts drift by.",
        "I'm here with you; thoughts can float past.",
      ],
      "OPEN.peek": [
        "I'm here whenever you're ready.",
        "I'm right beside you, no rush.",
      ],
      "OPEN.glow": [
        "I feel calm here with you.",
        "It's peaceful here with you.",
      ],
      "OPEN.here": [
        "I'm here with you.",
      ],
      "LEVER.calm": "some calm",
      "LEVER.connection": "some connection",
      "LEVER.hope": "a little hope",
      "QUIET.i_m_here_keeping_you": "I'm here, keeping you company.",
      "WELCOME.welcome_back_i_m_glad": "Welcome back. I'm glad you're here.",
      // line()
      "line.let_s_enjoy_this_quiet": "Let's enjoy this quiet moment together.",
      "line.let_s_together": "Let's {{v0}} {{v1}} together.",
      "line.welcome_back": "Welcome back. ",
      // module level
      "HOW.i_grow_when_you_check": "I grow when you check in, try a step, save to your journal, finish a practice, or come back another day. Hard days never make me smaller.",
      "ACTIONS.title": "Write a story",
      "ACTIONS.sub": "Your journal, a gentle story and a comfort prompt",
      "ACTIONS.title_2": "My days",
      "ACTIONS.sub_2": "Your days, inner peace over time and checkpoints",
      "ACTIONS.title_3": "Look closer",
      "ACTIONS.sub_3": "Every insight and each feeling in words",
      "ACTIONS.title_4": "Save & share code",
      "ACTIONS.sub_4": "Your freeing mix and the .mf code",
      "ACTIONS.sub_5": "The equations, and numbers you can adjust",
      "ACTIONS.title_5": "Forgive & breathe",
      "ACTIONS.sub_6": "Forgiveness paths, patience and the breathing circle",
      // draw()
      "draw.label.your_companion_open": "{{name}}, your companion ({{v1}} {{ANIMAL}}). Open",
      "draw.growing_with_you": "{{name}} {{ANIMAL}} · growing with you",
      "draw.percent_of_the_way_to": "{{name}}: {{pct}} percent of the way to {{name2}}",
      "draw.fully_grown": "{{name}}: fully grown",
      "draw.fully_grown_2": "{{name}}, fully grown",
      "draw.more_than_twenty": "more than twenty",
      "draw.days_together": "Days together: {{v0}}.",
      "draw.our_first_day_together": "Our first day together.",
      // setName()
      "setName.nice_to_meet_you": "Nice to meet you, {{name}}.",
      // module level
      "n.a_new_name_for_your": "A new name for your companion?",
      "start_s_growth_again_from": "Start {{name}}'s growth again from a newborn? Your journal and readings stay.",
      "grew_now": "{{name}} grew: now {{v1}}.",
    },

    // ===== features/credits.js — Credits: the researchers and sources MindFrame stands on. =====
    "credits": {
      // module level
      "GRATITUDE.with_gratitude_to_every_researcher": "With gratitude to every researcher, clinician, translator and writer listed here, whose careful work this small app stands on. All credit and glory to God.",
      "MEDIA.films_are_credited_to_their": "Films are credited to their studios and filmmakers, and songs to their artists and songwriters. MindFrame names them only, links to public pages, and quotes no lyrics.",
      "CATEGORIES": [
        "Emotion, cognition and CBT",
        "DBT, ACT, mindfulness and compassion",
        "Forgiveness, virtue, gratitude and peace",
        "Relationships and belonging",
        "Body, writing and activity",
        "Inner speech, language and design",
        "Media",
        "Mathematics",
        "Philosophy and spiritual writers",
        "Time, dynamics, control and imagery",
        "Scripture and data",
      ],
      "TERMS.the_nine_movers": "The nine movers",
      "TERMS.which_feelings_and_habits_of": "Which feelings and habits of mind are tracked: fear, sadness, anger, shame, calm, connection, hope, replaying and avoiding.",
      "TERMS": [
        "Barlow, D. H.",
        "Beck, A. T., Steer",
        "Kim, S.",
        "Zaccaro",
        "Holt-Lunstad",
        "Snyder",
        "Aldao",
        "Nolen-Hoeksema",
        "Bond, F. W.",
        "Gillanders",
      ],
      "TERMS.reading_your_words": "Reading your words",
      "TERMS.how_words_become_the_reading": "How words become the reading: thinking traps, absolute words and relationship patterns.",
      "TERMS_2": [
        "Beck, A. T. (1976)",
        "Burns",
        "Al-Mosaiwi",
        "Gottman, J. M. (1994)",
        "Gottman, J. M., & Levenson, R. W. (1992)",
        "Gottman, J. M., & Levenson, R. W. (2000)",
        "Heyman",
      ],
      "TERMS.outside_hurt": "Outside hurt",
      "TERMS.criticism_aimed_at_you_kept": "Criticism aimed at you, kept apart from harsh words you use yourself.",
      "TERMS_3": [
        "Gottman, J. M., & Levenson, R. W. (1992)",
      ],
      "TERMS.the_kai_shield": "The Kai shield",
      "TERMS.steadiness_under_pressure_self_awareness": "Steadiness under pressure: self-awareness, patience, empathy and a respectful guard.",
      "TERMS.one_gentle_step_home": "One gentle step home",
      "TERMS.each_update_moves_a_little": "Each update moves a little toward home, more when far away. A design choice; no single source.",
      "TERMS.feelings_feeding_each_other": "Feelings feeding each other",
      "TERMS.the_small_table_of_which": "The small table of which feelings amplify or calm each other. Design assumptions; no single source.",
      "TERMS.peace_near_home": "Peace near home",
      "TERMS.peace_as_being_close_to": "Peace as being close to home with nothing pulling hard, an even mind.",
      "TERMS_4": [
        "Desbordes",
        "Kabat-Zinn, J. (2003)",
      ],
      "TERMS.hidden_conflicts": "Hidden conflicts",
      "TERMS.two_pulls_at_once_like": "Two pulls at once, like wanting and fearing; mixed feelings are a normal part of change.",
      "TERMS.true_size": "True size",
      "TERMS.thinking_that_is_neither_too": "Thinking that is neither too big nor too small: true humility.",
      "TERMS_5": [
        "Beck, A. T. (1976)",
        "Burns",
        "Al-Mosaiwi",
        "Tangney",
        "Neff",
        "Gilbert, P., & Procter",
        "Gilbert, P. (2009)",
        "Gross",
      ],
      "TERMS.the_lever": "The lever",
      "TERMS.the_one_place_where_a": "The one place where a small step helps most.",
      "TERMS.the_practice": "The practice",
      "TERMS.the_step_you_are_offered": "The step you are offered: breathing, labeling, kindness to yourself, a walk, writing and more.",
      "TERMS_6": [
        "Stahl",
        "Segal",
        "Kabat-Zinn, J. (1990)",
        "Lieberman",
        "Neff",
        "Zaccaro",
        "Gross",
        "Schnitker",
        "Bowen",
        "Emmons",
        "Linehan, M. M. (2015)",
        "Jacobson",
        "McCallie",
        "Pennebaker",
        "Frattaroli",
        "Rebar",
        "Ekkekakis",
      ],
      "TERMS.forgiving_yourself_and_forgiving_someone": "Forgiving yourself and forgiving someone else, step by step.",
      "TERMS_7": [
        "Cornish",
        "Neff",
        "Worthington",
        "Wade, N. G., Hoyt",
        "Enright",
        "McCullough, M. E., Bono",
      ],
      "TERMS.the_freeing_mix": "The freeing mix",
      "TERMS.the_gentlest_mix_of_feelings": "The gentlest mix of feelings to aim for, in true size.",
      "TERMS_8": [
        "Tangney",
        "Burns",
        "Neff",
        "Gilbert, P., & Procter",
        "Gilbert, P. (2009)",
        "Teresa of Ávila",
      ],
      "TERMS.loosen_the_grip": "Loosen the grip",
      "TERMS.loosening_a_thought_s_hold": "Loosening a thought's hold without pushing it away.",
      "TERMS.past_to_future": "Past to future",
      "TERMS.from_what_happened_toward_what": "From what happened toward what can grow.",
      "TERMS_9": [
        "Neff",
        "Cornish",
        "Hofmann, S. G., Grossman",
        "Hayes, S. C., Luoma",
        "King, L. A.",
        "Peters, M. L.",
        "Hershfield",
      ],
      "TERMS.scripture_seed": "Scripture seed",
      "TERMS.with_faith_on_the_verses": "With faith on, the verses chosen for this moment.",
      "TERMS_10": [
        "World English Bible",
      ],
      "TERMS.continue_your_story": "Continue your story",
      "TERMS.films_and_songs_that_continue": "Films and songs that continue the parable (credited to their studios and artists).",
      "TERMS_11": [
        "Zillmann",
        "Wikidata",
        "The Movie Database",
      ],
      "TERMS.the_words_you_read": "The words you read",
      "TERMS.short_plain_words_first_with": "Short, plain words first, with the numbers behind Show the math.",
      "SHARE_LABEL.structural_map_not_effect_size": "structural map, not effect size or validated weight",
      // entry()
      "entry.source_key_matches_entries": "source key \"{{key}}\" matches {{length}} entries",
      // label()
      "label.SPECIAL.World_English_Bible": "World English Bible",
      "label.SPECIAL.Teresa_of__vila": "Teresa of Ávila",
      "label.et_al": " et al.",
      // module level
      "PUSH27.time_dynamics_control_and_imagery": "Time, dynamics, control and imagery",
      "ideas_from": "Ideas from {{v0}}.",
      "a_design_choice_of_this": "A design choice of this app.",
      // mountSources()
      "mountSources.of_the_sources_in_this": "{{length}} of the {{ATTR_N}} sources in this map inform a part of the model; the other {{length2}} give context, ways to test it, or wider reading.",
      "mountSources.share_terms_a_source_informs": "Share = terms a source informs ÷ {{length}}. A {{SHARE_LABEL}}.",
      // mount()
      "mount.sources_checked_against_crossref_open": "{{verified}} sources checked against Crossref, Open Library, publishers or their own archives; {{flagged}} flagged where no full citation could be confirmed.",
    },

    // ===== features/forgiveness.js — "Forgive & breathe" (was Grace the Dove): forgiving yourself and forgiving =====
    "forgiveness": {
      // hook()
      "hook.self_blame_forgiveness": "self-blame (forgiveness)",
      "hook.resentment_forgiveness": "resentment (forgiveness)",
      // module level
      "FAITH.self": "Forgive us our debts, as we also forgive our debtors (from the Lord's Prayer); that mercy is meant for you too.",
      "FAITH.other": "Bear with each other and forgive one another, as the Lord forgave you (from Colossians); you can ask for help to begin.",
      // cardLines()
      "cardLines.a_heavy_weight": "a heavy weight",
      "cardLines.some_weight": "some weight",
      "cardLines.forgiving_yourself_there_s_of": "Forgiving yourself: there's {{v0}} of self-blame here. You can own your part and still be kind to yourself.",
      "cardLines.a_deep_hurt": "a deep hurt",
      "cardLines.forgiving_someone_there_s_here": "Forgiving someone: there's {{v0}} here that still stings. Forgiveness can come slowly, as a gift you choose, for your own peace.",
      "cardLines.you_can_go_one_gentle": "You can go one gentle step at a time, whenever you are ready.",
      // peaceLine()
      "peaceLine.forgive_breathe_can_help_here": "Forgive & breathe can help here: forgiving {{v0}} is a gentle way to {{v1}} {{noun}}.",
      // module level
      "PATHS.self.title": "Forgive myself",
      "PATHS.self.intro": "Self-forgiveness isn't letting yourself off the hook. It's owning what's yours, making what repair you can, and treating yourself with the kindness you'd give a friend. If you weren't at fault (for example, if someone harmed you), there's nothing here to forgive in yourself; the self-compassion step is still for you.",
      "PATHS.self.steps.say": "Name what happened, plainly and fairly: not bigger, not smaller. Which part is yours, and which part isn't?",
      "PATHS.self.steps.box": "The part that's mine is…",
      "PATHS.self.steps.say_2": "Let yourself feel sorry without punishing yourself. Guilt says “I did something wrong”; it doesn't have to become “I am bad.”",
      "PATHS.self.steps.box_2": "I'm sorry that…",
      "PATHS.self.steps.say_3": "Is there one way to repair it: an apology, making amends, or doing it differently next time? If repair isn't possible or safe, a kind act toward someone else counts.",
      "PATHS.self.steps.box_3": "One way I can make it right is…",
      "PATHS.self.steps.say_4": "Self-compassion: with a hand on your heart, say “This is hard” (mindfulness), “Everyone makes mistakes” (common humanity), “May I be kind to myself” (self-kindness). Then name how you'll grow.",
      "PATHS.self.steps.box_4": "Next time I'll…",
      "PATHS.self.source": "The four Rs of self-forgiveness: Cornish & Wade (2015). Self-compassion: Neff (2003).",
      "PATHS.self.faith": "Forgive us our debts, as we also forgive our debtors (from the Lord's Prayer). God's mercy is meant for you too.",
      "PATHS.other.title": "Forgive someone",
      "PATHS.other.intro.forgiving_is_a_choice_you": "Forgiving is a choice you can make slowly, at your own pace, for your own peace. It often unfolds over time: noticing the hurt, deciding to forgive, working to understand, and finding meaning. ",
      "PATHS.other.intro.if_you_re_not_safe": " If you're not safe, reach out for help first.",
      "PATHS.other.steps.say": "Recall the hurt as calmly as you can, like a fair witness. No need to replay every detail.",
      "PATHS.other.steps.box": "What happened was…",
      "PATHS.other.steps.say_2": "Imagine what might have been going on for them: pressures, fears, their own history. Understanding isn't agreeing.",
      "PATHS.other.steps.box_2": "Maybe they were…",
      "PATHS.other.steps.k": "Altruistic gift",
      "PATHS.other.steps.say_3": "Remember a time you were forgiven and how it felt. Forgiveness can be a gift you give, not because they earned it.",
      "PATHS.other.steps.box_3": "A time I was forgiven…",
      "PATHS.other.steps.say_4": "Commit to the forgiveness you've reached, even a little: write it here, or tell someone you trust.",
      "PATHS.other.steps.box_4": "Today I choose to…",
      "PATHS.other.steps.k_2": "Hold on",
      "PATHS.other.steps.say_5": "When the hurt comes back, it doesn't mean you didn't forgive. Come back to what you committed to.",
      "PATHS.other.steps.box_5": "When it comes back, I'll remember…",
      "PATHS.other.source": "REACH: Worthington (2006); evidence: Wade, Hoyt, Kidwell & Worthington (2014). Process model: Enright & Fitzgibbons (2015).",
      "PATHS.other.faith": "Bear with each other and forgive one another, as the Lord forgave you (from Colossians). Even on the cross, Jesus prayed, “Father, forgive them” (from Luke). You can ask God for help to begin.",
      "step_of": "Step {{v0}} of {{length}}",
      "optional_note_kept_only_on": "{{k}}: optional note, kept only on this page",
      "start_over": "Start over",
      "next_step": "Next step",
      "write_in_a_step_s": "Write in a step's box first; nothing is saved otherwise.",
      "saved_in_your_journal_on": "Saved in your journal on this device.",
      // render()
      "render.tap_update_for_a_suggested": "Tap Update for a suggested path. You can open either one any time.",
      "render.from_your_reading_forgiving_yourself": "From your reading: forgiving yourself may help most right now.",
      "render.from_your_reading_forgiving_someone": "From your reading: forgiving someone may help most right now, at your own pace.",
      "render.from_your_reading_no_forgiveness": "From your reading: no forgiveness path stands out. Both are here if you want them.",
    },

    // ===== features/freeing.js — the freeing mix: the combination of feelings that best =====
    "freeing": {
      // module level
      "EASE_NOUN.avoidance": "the avoiding",
      "EASE_NOUN.calm": "the calm",
      "EASE_NOUN.connection": "the closeness",
      "EASE_NOUN.hope": "the hope",
      "BAND_WORD.a_little": "a little peace",
      "BAND_WORD.growing": "growing peace",
      "BAND_WORD.close": "close to steady",
      "TRUE_HUMILITY.true_humility_sees_you_at": "True humility sees you at your real size: not worse than others, not better; worthy of kindness and still learning.",
      "FAITH.think_of_yourself_with_sober": "Think of yourself with sober judgment (from Romans). To be humble is to walk in truth (Teresa of Ávila), and your worth rests on God's love, not on your record: we love because he first loved us (from First John).",
      "GRACE.the_forgive_myself_path_can": "The Forgive myself path can help you own your part and set the rest down.",
      // cardLines()
      "cardLines.lines.your_freeing_mix": "Your freeing mix: {{v0}}.",
      "cardLines.how.gentle_step_one_band_at": "{{v0}} gentle step{{n_s}}, one band at a time",
      "cardLines.inner_peace_rises_within_and": "{{how}}: inner peace rises within {{v1}}, and shame only goes down.",
      "cardLines.inner_peace_could_go_from": "{{how}}: inner peace could go from {{v1}} to {{v2}}, and shame only goes down.",
      "cardLines.step.one_step_start_with_the": "One step: start with the self-compassion break in the One step below.",
      "cardLines.step.one_step": "One step: {{v0}}.",
      // module level
      "EXTRA_WORD.blame": "blaming myself",
      "EXTRA_WORD.putdown": "putting myself down",
      // line()
      "line.at_rest": "at rest",
      "line.now_freeing_mix": "Now: {{v0}} → Freeing mix: {{v1}}",
      // render()
      "render.tap_update_to_see_your": "Tap Update to see your freeing mix.",
    },

    // ===== features/grip.js — "Loosen the grip": fear, mental vices and looping thoughts. =====
    "grip": {
      // module level
      "VICE.desire.name": "a strong pull of desire",
      "VICE.envy.name": "comparing yourself (envy)",
      "VICE.resentment.name": "an old hurt held tight (resentment)",
      "VICE.pride.name": "needing to be above others (pride)",
      "TOOL.defuse": "Notice, name, defuse: notice the thought, name it (“I'm having the thought that…”), and let it sit there like a passing car, without arguing.",
      "TOOL.surf": "Urge surfing: notice where the pull sits in your body and ride it like a wave as it rises, peaks and falls, without acting on it or fighting it.",
      "TOOL.window": "A worry window: when the loop starts, write it down and save it for a set quarter hour later in the day; outside that time, gently come back to now.",
      "WHAT.loop": "a looping, replaying mind",
      // lines()
      "lines.out.loosen_the_grip_is_pulling": "Loosen the grip: {{what}} is pulling at you. Thoughts like this are common and human; pushing them away tends to bring them back, so the aim is to loosen their hold, not to get rid of them.",
      "lines.like_a_kind_word_or": ", like a kind word or a short walk",
      "lines.then_one_small_step_toward": "Then one small step toward what matters to you{{v0}}.",
      "lines.with_practice_its_hold_may": "With practice, its hold may loosen a little, even if it still feels like {{from}}. It may come back; each time is practice, not failure.",
      "lines.with_practice_its_hold_may_2": "With practice, its hold may loosen from {{from}} toward {{to}}, slowly. It may come back; each time is practice, not failure.",
      "lines.with_faith_scripture_speaks_of": "With faith: Scripture speaks of bringing thoughts to Christ and setting the mind on what is true ({{ref}}; {{ref1}}); as a practice of turning, not of forcing thoughts away.",
    },

    // ===== features/historian.js — "My days" (was Hazel the Owl, the Historian). =====
    "historian": {
      // module level
      "DIR_WORDS.up": "a step toward steady",
      "DIR_WORDS.side": "a sideways day (showing up still counts)",
      "DIR_WORDS.down": "a heavier day",
      "the_first_day_on_the": "the first day on the map",
      // peaceLine()
      "peaceLine.inner_peace_on_your_first": "Inner peace on your first saved day: {{v0}}.",
      "peaceLine.dir.dipping_for_now": "dipping for now",
      "peaceLine.dir.holding_steady": "holding steady",
      "peaceLine.inner_peace_across_your_saved": "Inner peace across your saved days: {{v0}}, {{dir}}.",
      "peaceLine.inner_peace_across_your_saved_2": "Inner peace across your saved days: from {{v0}} to {{v1}}, {{dir}}.",
      // module level
      "checkpoint_saved_numbers_only": "Checkpoint saved (numbers only).",
      // render()
      "render.nothing_recorded_yet_save_a": "Nothing recorded yet. Save a checkpoint or accept a step.",
      // module level
      "go_back_to_checkpoint": "Go back to checkpoint {{label}}",
      "back_at_checkpoint_new_words": "Back at checkpoint {{label}}. New words add to it.",
    },

    // ===== features/movies.js — "Watch something": film suggestions from the reading. =====
    "movies": {
      // module level
      "MOODS.gentle.name": "gentle and uplifting",
      "MOODS.gentle.short": "something gentle",
      "MOODS.gentle.ask": "Want to watch something gentle together?",
      "MOODS.gentle.why": "When sadness is heavy, a warm, gentle story can lift the mood a little.",
      "MOODS.cozy.name": "cozy and safe",
      "MOODS.cozy.short": "something cozy and safe",
      "MOODS.cozy.ask": "Want to watch something cozy and safe together?",
      "MOODS.cozy.why": "When fear is loud, a familiar, funny film with a safe ending can help you settle.",
      "MOODS.calm.name": "calming, with some perspective",
      "MOODS.calm.short": "something calming",
      "MOODS.calm.ask": "Want to watch something calming together?",
      "MOODS.calm.why": "When anger runs hot, slow nature films and quiet stories can cool things down and widen the view.",
      "MOODS.worth.short": "a story about second chances",
      "MOODS.worth.ask": "Want to watch a story about second chances together?",
      "MOODS.worth.why": "When shame or self-blame is strong, stories of second chances can remind you that people grow and are worth kindness.",
      "MOODS.together.name": "about friendship and family",
      "MOODS.together.short": "a friendship story",
      "MOODS.together.ask": "Want to watch a friendship story together?",
      "MOODS.together.why": "When you feel alone, films about friendship and family can feel like company.",
      "MOODS.absorb.name": "absorbing, a light adventure",
      "MOODS.absorb.short": "a light adventure",
      "MOODS.absorb.ask": "Want to get lost in a light adventure together?",
      "MOODS.absorb.why": "When thoughts keep replaying, an absorbing adventure can give your mind a rest.",
      "MOODS.inspire.short": "something inspiring",
      "MOODS.inspire.ask": "Want to watch something inspiring together?",
      "MOODS.inspire.why": "When you feel calm or hopeful, an inspiring story can build on it.",
      // cardLine()
      "cardLine.your_companion": "Your companion",
      "cardLine.watch_something_like_has_more": "Watch something: {{short}}, like {{t}}. {{v2}} has more ideas.",
      // module level
      "AGENT.mindframe_21_https_github_com": "MindFrame/21 (https://github.com/ryryespi/mindframe)",
      // wikidataRequest()
      "wikidataRequest.unknown_mood": "unknown mood",
      "wikidataRequest.query.hint_query_hint_optimizer_none": "  hint:Query hint:optimizer \"None\".",
      "wikidataRequest.query.film_wdt_p136_g": "  ?film wdt:P136 ?g.",
      "wikidataRequest.query.film_wdt_p31_wd_q11424": "  ?film wdt:P31 wd:Q11424.",
      "wikidataRequest.query.filter_exists_film_wdt_p1657": "  FILTER EXISTS { { ?film wdt:P1657 ?ok. VALUES ?ok { {{v0}} } } UNION { ?film wdt:P136 ?kid. VALUES ?kid { {{v1}} } } }",
      "wikidataRequest.query.filter_not_exists_film_wdt": "  FILTER NOT EXISTS { ?film wdt:P1657 ?no. VALUES ?no { {{v0}} } }",
      "wikidataRequest.query.filter_not_exists_film_wdt_2": "  FILTER NOT EXISTS { ?film wdt:P136 ?skip. VALUES ?skip { {{v0}} } }",
      "wikidataRequest.query.a_schema_about_film_schema": "  ?a schema:about ?film; schema:isPartOf <https://en.wikipedia.org/>.",
      "wikidataRequest.filters.well_known_wikipedia_languages": "well known ({{min}}+ Wikipedia languages)",
      "wikidataRequest.filters.rated_g_or_pg_or": "rated G or PG, or a family, children's or nature film",
      "wikidataRequest.filters.not_pg_13_or_r": "not PG-13 or R",
      "wikidataRequest.filters.no_films": "no {{v0}} films",
      "wikidataRequest.filters.has_an_english_wikipedia_page": "has an English Wikipedia page",
      // tmdbRequest()
      "tmdbRequest.no_key": "no key",
      "tmdbRequest.filters": [
        "rated G or PG (US)",
        "rated by 1000+ people",
        "no adult titles",
      ],
      // preview()
      "preview.only_this_goes_to_film": "Only this goes to {{host}}: film genres ({{v1}}) and fixed filters ({{v2}}). Nothing you typed, no feelings and no names.",
      // module level
      "why": "A well-known {{v0}} (from Wikidata).",
      "why_2": "Well rated on TMDB.",
      "SORRY.offline": "You seem to be offline. The films above still work without the network.",
      "SORRY.busy": "The film database is busy right now. Try again in a little while.",
      "SORRY.error": "Couldn't get more films just now. The films above still work.",
      "noopener_noreferrer": "noopener noreferrer",
      "rated_of_ten": "{{why}} Rated {{rating}} of ten.",
      // render()
      "render.tap_update_first_and_i": "Tap Update first and I'll suggest a film for how you feel. Here are some gentle ones.",
      "render.film_mood": "Film mood: {{name}}.",
      "render.your_tmdb_key_is_saved": "Your TMDB key is saved on this device. Find more online uses TMDB.",
      "render.off_find_more_online_uses": "Off. Find more online uses Wikidata (no key).",
      // module level
      "looking_for_more_films": "Looking for more films…",
      "no_new_films_found_this": "No new films found this time; the list above still works.",
      "found_more_films_from_kept": "Found more films from {{v0}} (kept only until you close the app).",
      "that_doesn_t_look_like": "That doesn't look like a TMDB v3 API key (32 letters and numbers).",
    },

    // ===== features/parable.js — "A parable of peace" and "Continue your story". =====
    "parable": {
      // module level
      "FEEL.fear": "a heavy bag of fear",
      "FEEL.sadness": "a heavy bag of sorrow",
      "FEEL.anger": "a hot coal of anger",
      "FEEL.shame": "a stone of shame",
      "FEEL.rumination": "a tangle of the same thoughts",
      "FEEL.avoidance": "a wish to turn back",
      "GRIP.loop": "the old loop of thoughts",
      "GRIP.vice": "a pull that kept tugging at the sleeve",
      "PAST.self": "the traveler looked back at a mistake, spoke to it as kindly as to a friend, and set down the stone of self-blame",
      "PAST.other": "the traveler thought of the one who had caused the hurt and, slowly, wished them well, without pretending the hurt was small",
      "PAST.loop": "the traveler let the old memory walk behind, no longer turning around to replay it",
      "AHEAD.bps": "then she pictured the road ahead going as well as it reasonably could, and one small thing to start today",
      "AHEAD.future": "then she wrote a short note to the self who would arrive a year from now",
      // beats()
      "beats.open.seeds_rested_in_still_water": "Seeds rested in still water above a stone counter set on the cornerstone, the way Christ is called the chief cornerstone (1 Peter 2:6), and a tree planted by streams of water bears fruit in its season (Psalm 1:3)",
      "beats.open.seeds_rested_in_still_water_2": "Seeds rested in still water above a stone counter set on a strong cornerstone, waiting for their season",
      "beats.text.a_quiet_heart": "a quiet heart",
      "beats.text": "{{open}}. Once, a traveler carried {{v1}} past that water along a winding road, and {{friend}} the {{animal}} walked beside her.",
      "beats.text_2": "{{v0}} tugged at her; she didn't fight it or run, she named it and let it walk alongside, and its hold loosened a little.",
      "beats.text_3": "At a crossroads, {{v0}}; {{v1}}.",
      "beats.text_4": "At a quiet bend, {{friend}} showed her one small practice{{v1}}, and she tried it, one breath at a time{{v2}}.",
      "beats.text.you_are": "you are",
      "beats.text.she_was": "she was",
      "beats.text_5": "She remembered words about {{v0}} ({{v1}}), and that {{v2}}.",
      "beats.text_6": "She remembered that {{v0}}.",
      "beats.text_7": "Nothing changed all at once; her peace, {{band}} at first, grew a little with each step she took.",
      "beats.text_8": "Before evening she stopped at a long table and shared bread with her neighbors, and the ordinary day felt steady and good.",
      "beats.text.by_evening_she_sat_by": "By evening she sat by still water, and rest came, not because the road was gone, but because she was not walking it alone.",
      "beats.text.by_evening_she_sat_by_2": "By evening she sat by still water and rested, carrying the road more lightly than before.",
      // module level
      "FILM_LINE.watch_it_as_the_traveler": "Watch it as the traveler's next evening by the fire: notice where someone in it carries something heavy and finds a small way forward.",
      "SONG_LINE.fear": "let it walk beside you like the friend on the road",
      "SONG_LINE.sadness": "let it sit with you at the still water",
      "SONG_LINE.anger": "let it cool the coal a little",
      "SONG_LINE.shame": "let it remind you that the stone can be set down",
      "SONG_LINE.calm": "breathe slowly with it, as the traveler rests",
      "SONG_LINE.connection": "think of who walks beside you",
      "SONG_LINE.hope": "picture the road ahead",
      "SONG_LINE.rumination": "let it give your mind one place to rest",
      "SONG_LINE.avoidance": "take one step forward while it plays",
      "SONG_LINE.patience": "let it be slow; the road is long and that is all right",
      "SONG_LINE.gentleness": "answer the day gently",
      "SONG_LINE.selfcontrol": "breathe once before you answer anything",
      "SONG_LINE.renewal": "let it be the first page of the next chapter",
    },

    // ===== features/past.js — "Past to future": from what happened toward what can grow. =====
    "past": {
      // module level
      "TECH.self": "Self-compassion: speak to yourself as you would to a friend, remember that everyone stumbles, and notice the hurt without drowning in it. Then the four Rs: take responsibility, feel remorse without self-punishment, restore what you can, and renew your commitment to your values.",
      "TECH.other": "Loving-kindness: wish well slowly, first to yourself, then someone you love, then someone neutral, then the person who is hard for you, then all people. Wishing well is not excusing what happened.",
      "TECH.loop": "Acceptance: say to yourself, “This happened, and I'm having thoughts about it,” and let the memory be there without replaying it to fix it. You can carry it and still move.",
      "FUTURE.bps": "Toward the future: write for a few minutes about your best possible self, a life where things have gone as well as they reasonably could, and notice one thing you could start now.",
      "FUTURE.future": "Toward the future: write a short note to yourself a year from now, about who you are growing into; that future you is still you.",
      // lines()
      "lines.out": [
        "Past to future: what happened is real, and it doesn't have to decide what comes next.",
      ],
      "lines.what.the_weight_of_the_past": "the weight of the past",
      "lines.what.replaying_the_past": "replaying the past",
      "lines.from_toward": " from {{a}} toward {{b}}",
      "lines.from_toward_2": " from {{h0}} toward {{h1}}",
      "lines.with_practice_over_days_may": "With practice over days, {{what}} may ease{{a_s}}, and hope may grow{{h0_s}}. The past stays part of your story; it doesn't have to lead it.",
      "lines.with_faith_scripture_speaks_of": "With faith: Scripture speaks of pressing on toward what is ahead, of a new thing springing up, of mercies new every morning, and of forgiving as Christ forgave ({{v0}}).",
    },

    // ===== features/picker.js — the "Write" / "Pick feelings" toggle and the feelings =====
    "picker": {
      // module level
      "tap_to_change": "{{v0}}: {{l}}. Tap to change.",
      // changed()
      "changed.tap_update_to_read_the": "Tap Update to read the feelings you picked.",
    },

    // ===== features/practices.js — patience and mindfulness practices (in "Forgive & =====
    "practices": {
      // module level
      "LIBRARY.stop.source": "Stahl & Goldstein, 2010 (MBSR)",
      // say()
      "say.stop_stop_what_you_re": "STOP: stop what you're doing, take {{times}} slow breaths, observe what's here in your body and mind, then proceed with one kind next action",
      // module level
      "LIBRARY.stop.steps": [
        "Stop: pause whatever you're doing.",
        "Take a breath: one or a few slow breaths, a little longer out than in.",
        "Observe: notice your body, your feelings and your thoughts, without fixing anything.",
        "Proceed: choose one kind, useful next action.",
      ],
      "LIBRARY.space.name": "Three-minute breathing space",
      "LIBRARY.space.source": "Segal, Williams & Teasdale, 2013 (MBCT)",
      // say()
      "say.three_minute_breathing_space_notice": "Three-minute breathing space: notice what's here, gather your attention on {{times}} slow breaths, then widen it to your whole body",
      // module level
      "LIBRARY.space.steps": [
        "About a minute: notice what's here right now: thoughts, feelings, body sensations.",
        "About a minute: gather your attention on the breath in your belly.",
        "About a minute: widen your attention to your whole body, breathing with it as it is.",
      ],
      "LIBRARY.senses.source": "a common grounding exercise (no single primary source)",
      // say()
      "say.five_senses_name_five_things": "Five senses: name five things you can see, four you can touch, three you can hear, two you can smell and one you can taste",
      // module level
      "LIBRARY.senses.steps": [
        "Name five things you can see.",
        "Four things you can touch.",
        "Three things you can hear.",
        "Two things you can smell.",
        "One thing you can taste, or one kind thing about this moment.",
      ],
      "LIBRARY.body.name": "Short body scan",
      "LIBRARY.body.source": "Kabat-Zinn, 1990",
      // say()
      "say.short_body_scan_for_minutes": "Short body scan: for {{min}} minutes, move your attention slowly from your feet to your head, noticing without changing anything",
      // module level
      "LIBRARY.body.steps": [
        "Sit or lie comfortably and let your breath be as it is.",
        "Bring your attention to your feet, then slowly up through legs, belly, chest, hands, shoulders, face.",
        "Where there's tension, just notice it; breathe into it if you like.",
        "Finish with a sense of the whole body breathing.",
      ],
      "LIBRARY.label.name": "Name it to tame it",
      "LIBRARY.label.source": "affect labeling: Lieberman et al., 2007",
      // say()
      "say.name_it_to_tame_it": "Name it to tame it: put the feeling into one or two words, like “this is worry”, then breathe out slowly {{times}} times",
      // module level
      "LIBRARY.label.steps": [
        "Notice the strongest feeling right now.",
        "Name it in one or two plain words: “this is worry”, “this is hurt”.",
        "Let a thought be a thought: “I'm having the thought that…”",
        "Breathe out slowly and come back to what's in front of you.",
      ],
      "LIBRARY.kindness.name": "Self-compassion break",
      // say()
      "say.self_compassion_break_with_a": "Self-compassion break: with a hand on your heart, say “this is hard”, “others feel this too”, and “may I be kind to myself”, then tell one safe person",
      // module level
      "LIBRARY.kindness.steps": [
        "Mindfulness: “This is a moment of suffering.”",
        "Common humanity: “Everyone struggles and makes mistakes; I'm not alone.”",
        "Self-kindness: hand on your heart, “May I be kind to myself.”",
      ],
      "LIBRARY.pause.name": "Pause and breathe",
      "LIBRARY.pause.source": "slow breathing: Zaccaro et al., 2018",
      // say()
      "say.pause_step_away_for_minutes": "Pause: step away for {{min}} minutes and breathe out longer than in, {{times}} times, then name what matters to you here",
      // module level
      "LIBRARY.pause.steps": [
        "Step back from the moment if you can, even a few feet.",
        "Breathe in for about four, out for about six.",
        "Let the urge to act right now pass a little.",
        "Name what matters to you here, then choose your response.",
      ],
      "LIBRARY.waiting.name": "Reframe the wait",
      "LIBRARY.waiting.source": "reappraisal: Gross, 1998; patience: Schnitker, 2012",
      // say()
      "say.reframe_the_wait_breathe_out": "Reframe the wait: breathe out slowly {{times}} times, then name one thing this wait gives you room for",
      // module level
      "LIBRARY.waiting.steps": [
        "Notice the impatience in your body, without judging it.",
        "Breathe out slowly a few times.",
        "Look at the wait another way: what does it give you room for, or what is it protecting?",
        "Choose one small thing to do with this time.",
      ],
      "LIBRARY.surf.name": "Urge surfing",
      "LIBRARY.surf.source": "Bowen & Marlatt, 2009",
      // say()
      "say.urge_surfing_notice_the_pull": "Urge surfing: notice the pull to put it off as a wave, breathe with it as it rises, peaks and falls, then do {{min}} minutes of the thing you've been putting off",
      // module level
      "LIBRARY.surf.steps": [
        "Notice the urge and where you feel it in your body.",
        "Picture it as a wave: it rises, peaks, and falls on its own.",
        "Breathe with it and ride it without acting on it.",
        "When it passes a little, take the smallest first step.",
      ],
      "LIBRARY.gratitude.name": "Gratitude for what's here",
      "LIBRARY.gratitude.source": "Emmons & McCullough, 2003",
      // say()
      "say.gratitude_for_what_s_here": "Gratitude for what's here: name {{times}} things that are already okay right now; small ones count",
      // module level
      "LIBRARY.gratitude.steps": [
        "Look around: what is already here that you're glad of?",
        "Name three small things, as specific as you can.",
        "Stay with one of them for a breath or two.",
      ],
      "COLD_CAUTION.skip_this_if_you_have": "Skip this if you have a heart condition, low blood pressure, fainting, or an eating disorder; check with your doctor first.",
      "cold.name": "Cold-water reset",
      "cold.source": "TIP skills (Temperature): Linehan, 2015",
      // say()
      "say.cold_water_reset_splash_cool": "Cold-water reset: splash cool or cold water on your face, or hold something cold, for fifteen to thirty seconds while you breathe out slowly",
      // module level
      "cold.steps": [
        "Use cool or cold water, not icy: splash your face, or hold a cold pack or a cold drink against your cheeks and eyes.",
        "Keep it there for about 15 to 30 seconds while you breathe out slowly.",
        "Notice your body slowing down a little.",
        "Then take one slow breath and choose your next step.",
      ],
      "pmr.name": "Progressive muscle relaxation",
      "pmr.source": "Jacobson, 1938; review: McCallie, Blum & Hood, 2006",
      "pmr.caution": "Tense gently, never to the point of pain, and skip any area that's injured.",
      // say()
      "say.progressive_muscle_relaxation_for_about": "Progressive muscle relaxation: for about three minutes, tense your hands, shoulders, jaw and feet in turn for about five seconds, then let go for about ten",
      // module level
      "pmr.steps": [
        "Hands: make fists for about 5 seconds, then let go for about 10 and notice the difference.",
        "Shoulders: lift them toward your ears for about 5 seconds, then let them drop for about 10.",
        "Jaw: clench gently for about 5 seconds, then let it hang loose for about 10.",
        "Feet: curl your toes for about 5 seconds, then let go for about 10.",
        "Breathe out as you let go each time. About three minutes in all.",
      ],
      "dump.name": "Brain dump",
      "dump.source": "expressive writing: Pennebaker & Beall, 1986; Frattaroli, 2006 (small effects)",
      // say()
      "say.brain_dump_for_ten_minutes": "Brain dump: for ten minutes, write down whatever is going round in your head without fixing it, then keep what helps and let the rest go",
      // module level
      "dump.steps": [
        "Start the 10-minute timer below.",
        "Write whatever comes, as fast or slow as you like; spelling and sense don't matter.",
        "When the time is up, read it once if you want.",
        "Keep what helps (Save to journal), or tap Let it go and watch it clear.",
      ],
      "walk.name": "Short brisk walk",
      "walk.source": "physical activity: Rebar et al., 2015; short walks: Ekkekakis et al., 2000",
      "walk.caution": "Only where it's safe to walk; an easy pace is fine.",
      // say()
      "say.short_brisk_walk_walk_at": "Short brisk walk: walk at a brisk, comfortable pace for five to ten minutes, outside if you can, noticing what you see",
      // module level
      "walk.steps": [
        "Put on shoes and step outside if it's safe, or walk indoors.",
        "Walk briskly enough to breathe a little faster, still able to talk.",
        "Keep going for 5 to 10 minutes; notice three things you see on the way.",
        "When you stop, notice how your body and mood feel now.",
      ],
      // hook()
      "hook.notes": [
        "impatience wording",
      ],
      // bodyHook()
      "bodyHook.notes": [
        "body tension wording",
      ],
      "bodyHook.notes_2": [
        "low energy wording",
      ],
      // module level
      "FAITH.mindfulness": "Be still, and know that I am God (from the Psalms).",
      "FAITH.patience": "Love is patient, love is kind (from 1 Corinthians).",
      "FAITH.body": "Come to me, all who are weary, and I will give you rest (from Matthew).",
      "PHASE.in": "Breathe in…",
      "PHASE.hold": "Hold gently…",
      "PHASE.out": "Breathe out, slowly…",
      // stop()
      "stop.ready_when_you_are_in": "Ready when you are: in for four, out for six.",
      "stop.start_the_breathing_circle": "Start the breathing circle",
      // tick()
      "tick.done_notice_how_you_feel": "Done. Notice how you feel now.",
      "tick.breath_circle": "breath-circle {{phase}}",
      "tick.breath_of": "Breath {{v0}} of {{rounds}}",
      // dumpStop()
      "dumpStop.start_the_10_minute_timer": "Start the 10-minute timer",
      // dumpClear()
      "dumpClear.prefers_reduced_motion_reduce": "(prefers-reduced-motion: reduce)",
      // module level
      "stop_the_timer": "Stop the timer",
      "time_keep_what_helps_or": "Time. Keep what helps, or let it go.",
      "let_go_nothing_was_kept": "Let go. Nothing was kept.",
      "nothing_to_let_go_of": "Nothing to let go of yet.",
      "write_something_first_nothing_is": "Write something first; nothing is saved otherwise.",
      "brain_dump": "Brain dump\n{{t}}",
      // render()
      "render.suggested_now_from_your_reading": "Suggested now: {{name}}, from your reading.",
      "render.pick_any_practice_after_update": "Pick any practice. After Update, one is suggested from your reading.",
    },

    // ===== features/relationship.js — Gottman's "Four Horsemen", as a gentle pattern helper. =====
    "relationship": {
      // module level
      "HORSEMEN.criticism.antidote": "Gentle startup: talk about how you feel and what you need, not about what is wrong with them.",
      "HORSEMEN.criticism.example": "I feel worried when plans change last minute. Could we check in earlier?",
      "HORSEMEN.contempt.antidote": "Build a culture of appreciation: name one thing you respect or are grateful for in them.",
      "HORSEMEN.contempt.example": "I know you've been carrying a lot lately, and I appreciate it.",
      "HORSEMEN.defensiveness.antidote": "Take responsibility for a small part, even a little one.",
      "HORSEMEN.defensiveness.example": "You're right that I was late. I'm sorry about that part.",
      "HORSEMEN.stonewalling.antidote": "Self-soothe with a structured break, and agree on a set time to come back.",
      "HORSEMEN.stonewalling.example": "I'm flooded and need twenty minutes. Let's talk again at eight.",
      "title": "A pattern to notice: {{name}}",
    },

    // ===== features/scenes.js — the story scenes: small original SVG illustrations (push27). =====
    "scenes": {
      // module level
      "SCENES.seeds.label": "Seeds resting in still water above a stone counter on a cornerstone",
      "SCENES.road.label": "The traveler walks a winding road with the fawn beside her",
      "SCENES.loop.label": "A loose loop of string drifts away on the breeze as the traveler walks on",
      "SCENES.crossroads.label": "At a crossroads, a signpost points back and ahead; the traveler holds a small note",
      "SCENES.bend.label": "At a quiet bend, the traveler breathes slowly while the fawn rests",
      "SCENES.lamp.label": "A lamp glows in the window of a small house at dusk",
      "SCENES.horizon.label": "A wide horizon at dusk with open space",
      "SCENES.table.label": "She shares bread with neighbors at a long table",
      "SCENES.garden.label": "Tending a small garden, hands in the soil",
      "SCENES.friend.label": "A walk with a friend along a quiet path",
      "SCENES.hands.label": "Two hands helping lift a basket",
      "SCENES.stones.label": "Stepping stones across still water, one at a time",
      "SCENES.still.label": "Evening rest by still water, the traveler and the fawn together",
      "PROMPTS.table": "Share something ordinary: make tea or a snack for someone, or eat slowly with someone nearby.",
      "PROMPTS.garden": "Do one ordinary task slowly: water a plant, fold laundry, wash one dish with care.",
      "PROMPTS.friend": "Write one kind text to someone nearby, or ask a friend for a short walk.",
      "PROMPTS.still": "Sit by a window or near water for a few minutes, and let your breath slow.",
      "PROMPTS.horizon": "Give yourself some space: step outside and look at the farthest thing you can see.",
      "PROMPTS.hands": "Use your hands: hold something warm, notice its weight and texture, then help with one small thing.",
      "PROMPTS.lamp": "Name three things you can see and two you can hear, right where you are.",
      "PROMPTS.stones": "Take just the next small step, then pause before the one after it.",
    },

    // ===== features/scientist.js — "Show the math" (was Ada the Otter, the Scientist). =====
    "scientist": {
      // mathLines()
      "mathLines.h_home_with_faith_on": "h (home), with faith on: {{FAITH_HOME}} Wording only; the numbers are the same.",
      "mathLines.step_act_clip01_e_a": "step = act(clip01(e + a(e)·(h − e) + b·s(e)))",
      "mathLines.capped_at_a_cap_0": ", capped at a_cap = {{v0}} (λ > 0) → {{v1}}",
      "mathLines.a_e_min_a_max": "a(e) = min(a_max, a0 + k‖e − h‖) = min({{v0}}, {{v1}} + {{v2}}·{{v3}}) = {{v4}}{{v5}}",
      "mathLines.d_e_h_after_one": "d = ‖e − h‖ = {{v0}} → {{v1}} after one step",
      "mathLines.none_nothing_active": "none (nothing active)",
      "mathLines.strongest_loop_gain": "strongest loop: {{v0}} × {{v1}} (gain {{v2}})",
      "mathLines.hidden_rise_in_steps": "hidden rise: {{v0}} {{v1}} → {{v2}} in {{k}} steps{{v4}}",
      "mathLines.moves_most_toward_home": "{{v0}} moves most toward home",
      "mathLines.no_move": "no move",
      "mathLines.act_stabilizer": "act(): {{v0}}; stabilizer {{v1}}",
      "mathLines.recovery_until_d_model_estimate": "recovery: {{v0}} until d < {{v1}} (model estimate)",
      "mathLines.g_1_e_raw_raw": "g = 1 − e^(−raw), raw = 0.6·grand + 0.5·certain-worst + 0.25·all-or-nothing + 0.1·min(3, absolutist) = {{v0}} → g = {{v1}}{{v2}}; adds 0.5·g to rumination and fusion",
      "mathLines.conflict_c_x_i_y": "conflict c = √(x_i·y_j): hard/process x ≥ 0.30 with grounding y = e ≥ 0.60 (pull toward) or y = 1 − e when e ≤ 0.40 (need); clashes in the words c = 0.50",
      // module level
      "clash_in_the_words_c": "  clash in the words ({{a}}): c = {{v1}}",
      "need_for": "need for {{b}}",
      // mathLines()
      "mathLines.positives_from_gain_j_e": "positives from gain_j = |e_j − h_j| − |next_j − h_j|: {{v0}}",
      "mathLines.p_1_1_d_d": "P = 1/(1 + (d/d₀)²)·(1 − γ·C_max)·(1 − δ·g) = {{v0}}·{{v1}}·{{v2}} = {{v3}} (d = {{v4}}, d₀ = {{v5}}, C_max = {{v6}}, γ = {{v7}}, g = {{v8}}, δ = {{v9}})",
      "mathLines.none_already_at_home": "none (already at home)",
      "mathLines.lever_argmax_p_i_for": "lever = argmax ΔP_i for e_i → h_i by 0.05: {{v0}}",
      "mathLines.not_reached_in_steps": "not reached in {{steps}} steps",
      "mathLines.n_steps_until_p_0": "n* = steps until P ≥ 0.80: {{v0}}",
      "mathLines.not_converged": ", not converged",
      "mathLines.e_fixed_point_after_steps": "e* (fixed point after {{steps}} steps{{v1}}): {{v2}}; ‖e* − h‖ = {{v3}}, P(e*) = {{v4}}",
      "mathLines.convergence_grounding_next_h_1": "convergence: grounding next − h = (1 − a)(e − h); hard/process 0 ≤ next ≤ (1 − a)e (s ≤ 0, clip at 0 = h)",
      "mathLines.next_h_1_a_e": "  ⇒ ‖next − h‖ ≤ (1 − a)‖e − h‖ with a ≥ min(a0, a_max, a_cap) = {{v0}} > 0: a contraction to e* = h, where P = 1 (rounding to 0.01 stops within 0.005/a)",
      "mathLines.the_kai_term_x_1": "  the Kai term X(1 − S)·w only enters the reading (line 1), pushes hard movers up and is bounded by X·w; the step map is unchanged, so the proof holds",
      "mathLines.f_self_e_shame_0": "F_self = e_shame·(0.4 + 0.6·c_self) = {{v0}}·(0.4 + 0.6·{{v1}}) = {{v2}};  F_other = e_anger·(0.4 + 0.6·c_other) = {{v3}}·(0.4 + 0.6·{{v4}}) = {{v5}}",
      "mathLines.yes_lever_in_the_path": "yes (lever in the path's movers)",
      "mathLines.forgiveness_path_f_0_35": "forgiveness path (θ_F = 0.35): {{v0}};  ΔP_F self {{v1}}{{v2}}, other {{v3}}{{v4}};  Grace recommended: {{v5}}",
      "mathLines.the_chip": ", the chip",
      "mathLines.u_1_e_0_7k": "u = 1 − e^(−0.7k) (putting yourself down, k = {{k}}{{v1}}) = {{v2}}; true size max(g, u) = {{v3}} in P_g = 1 − δ·max(g, u); adds shame +0.20, hope −0.20",
      "mathLines.freeing_mix_max_j_p": "freeing mix: max J = P − μ·N, μ = {{v0}}, N = e_shame + c_self·e_rumination + u·max(0, h_hope − e_hope) (c_self = {{v1}}, u = {{v2}})",
      "mathLines.moves_movers_per_step_one": "  moves: ≤ {{K}} movers per step, one band each toward h (ladder 0, 0.15, 0.45, 0.80), master's step direction; keep P' ≥ P and shame' ≤ shame; ≤ {{T}} steps, exhaustive over the subsets",
      "mathLines.no_feasible_move_raises_j": " (no feasible move raises J)",
      "mathLines.none_the_mover_s_own": "none (the mover's own step)",
      "mathLines.practice_pick_lever_e_d": "practice = pick(lever, e, d, c_wait = {{v0}}, c_tense = {{v1}}, c_tired = {{v2}}, peace band = {{band}}) → {{v4}}",
      "mathLines.cold_water_reset_lever_fear": "  cold-water reset: lever fear or anger, that mover ≥ 0.75 (very high) and peace band a little (P < 0.40); always with its caution",
      "mathLines.brain_dump_lever_rumination_0": "  brain dump: lever rumination ≥ 0.75;  progressive muscle relaxation: lever fear, avoidance or calm with c_tense ≥ 0.30",
      "mathLines.short_brisk_walk_lever_sadness": "  short brisk walk: lever sadness or avoidance with sadness ≥ 0.30, avoidance ≥ 0.30 and c_tired ≥ 0.30; or lever anger > 0.60 with peace not low",
      // module level
      "home_target_for": "home target for {{n}}",
      "how_much_changes": "how much {{a}} changes {{b}}",
      "h_kept_inside_0_1": "h.{{key}}: kept inside 0–1",
      "kept_inside_1_to_1": "{{a}}→{{b}}: kept inside −1 to 1",
      // render()
      "render.tap_update_to_see_the": "Tap Update to see the math.",
    },

    // ===== features/scribe.js — "Save & share code" (was Toby the Tortoise, the Scribe). =====
    "scribe": {
      // module level
      "cp_label": "cp {{n}} {{t}} label={{label}}",
      // serialize()
      "serialize.eq_step_act_clip01_e": "eq step = act(clip01(e + {{v0}}*(h - e) + {{v1}}*s(e)))",
      "serialize.pet_points_days_name": "pet points={{v0}} days={{v1}} name={{v2}}",
      // parseOld()
      "parseOld.notes": [
        "Imported from mf 1 and mapped onto the nine movers (best effort).",
      ],
      "parseOld.old_variables_weights_and_frameworks": "Old variables, weights and frameworks were left out; the new defaults apply.",
      // parse()
      "parse.errors.msg": "That code is too long (more than {{MAX_LINES}} lines).",
      "parse.errors.msg_2": "Nothing to import yet. Paste code that starts with “mf 4” (mf 3, mf 2 and mf 1 also work).",
      "parse.errors.msg_3": "Line {{v0}}: the code should start with “mf 4” (or mf 3, mf 2, mf 1).",
      "parse.errors.msg_4": "Line {{v0}}: this is version {{v1}}; this app reads versions 1, 2, 3 and 4.",
      // module level
      "should_look_like_name_0": "“{{tok}}” should look like name=0.50.",
      "isn_t_one_of_the": "“{{k}}” isn't one of the nine movers ({{v1}}).",
      "appears_twice": "{{k}} appears twice.",
      "must_be_between_0_and": "{{k}}={{v1}} must be between 0 and 1.",
      "home_appears_twice": "home appears twice.",
      "home_looks_like_home_calm": "home looks like home calm=0.80 connection=0.80 hope=0.80.",
      "isn_t_a_variable": "“{{tok}}” isn't a variable ({{v1}}).",
      "must_be_from_to": "{{v0}} must be from {{min}} to {{max}}.",
      "a_weight_looks_like_w": "a weight looks like w sadness>rumination=0.40.",
      "a_weight_joins_two_different": "a weight joins two different movers.",
      "a_weight_must_be_between": "a weight must be between -1 and 1.",
      "at_most_weights": "at most {{MAX_W}} weights.",
      "a_day_looks_like_day": "a day looks like day 2026-10-17 sadness=0.50.",
      "days_should_go_forward_in": "days should go forward in time.",
      "at_most_days": "at most {{MAX_DAYS}} days.",
      "a_checkpoint_starts_with_its": "a checkpoint starts with its number, like cp 1.",
      "checkpoint_numbers_should_go_up": "checkpoint numbers should go up.",
      "the_time_should_look_like": "the time should look like 2026-10-17T13:50.",
      "the_label_should_look_like": "the label should look like label=start (a-z, 0-9, dashes).",
      "at_most_checkpoints": "at most {{MAX_CHECKPOINTS}} checkpoints.",
      "ideal_looks_like_ideal_a": "ideal looks like ideal a=0.10 b=0.15 (each 0 to 1).",
      "isn_t_an_extra_chip": "“{{v0}}” isn't an extra chip ({{v1}}).",
      "should_look_like_points_12": "“{{tok}}” should look like points=12, days=3 or name=Willow.",
      "the_companion_s_name_can": "the companion's name can't be read.",
      "must_be_a_whole_number": "{{v0}}={{v1}} must be a whole number.",
      "the_header_appears_twice": "the header appears twice.",
      "isn_t_a_keyword_mf": "“{{kw}}” isn't a keyword (mf, home, e, vars, w, day, cp, ideal, eq, pick, extra, mix, free, pet, about).",
      "list": [
        "That file is too big for .mf code (over 64 KB).",
      ],
      "restored_from_code_new_words": "Restored from code. New words add to it.",
      "start_over_this_clears_the": "Start over? This clears the numbers and checkpoints on this device (not your journal).",
    },

    // ===== features/scripture.js — "Scripture for this moment" and "Verses together". =====
    "scripture": {
      // module level
      "THEMES.shame.label": "shame and forgiveness",
      "THEMES.calm.label": "calm and peace",
      "THEMES.connection.label": "connection and love",
      "THEMES.rumination.label": "renewing the mind",
      "THEMES.renewal.label": "the past and a new beginning",
      "THREAD.presence": "you are not facing this alone",
      "THREAD.courage": "courage can stand next to fear",
      "THREAD.comfort": "sorrow is met with comfort, not hurry",
      "THREAD.slow": "slowness is a strength here",
      "THREAD.peace": "peace is offered, not demanded",
      "THREAD.mercy": "mercy is bigger than the mistake",
      "THREAD.new": "something new can begin",
      "THREAD.rest": "rest is allowed",
      "THREAD.love": "love holds people together",
      "THREAD.hope": "hope looks ahead",
      "THREAD.mind": "a weary mind can be renewed",
      "THREAD.gentle": "gentleness is strong",
      "VALID.fear": "fear is how a mind tries to keep you safe",
      "VALID.sadness": "sadness is what caring feels like when something hurts",
      "VALID.anger": "anger often means something mattered to you",
      "VALID.shame": "shame hurts, and it is not the last word about you",
      "VALID.rumination": "a mind that keeps replaying is trying to solve something",
      "VALID.avoidance": "wanting to step back is a human way to protect yourself",
      "REFRAME.fear": "the verses don't ask you to stop feeling afraid; they place someone beside you in it",
      "REFRAME.sadness": "the verses don't hurry grief; they promise comfort along the way",
      "REFRAME.anger": "the verses don't call anger wrong; they invite you to be slow with it",
      "REFRAME.shame": "the verses speak of mercy, so what you did can be named without becoming who you are",
      "REFRAME.calm": "the verses offer peace as a gift you can receive a little at a time",
      "REFRAME.connection": "the verses remind you that you were made for love, given and received",
      "REFRAME.hope": "the verses lift your eyes a little further than today",
      "REFRAME.rumination": "the verses invite your mind to rest on what is true and good",
      "REFRAME.avoidance": "the verses offer courage for one small step, not the whole road",
      "REFRAME.patience": "the verses treat patience as fruit that grows, not a test you pass",
      "REFRAME.gentleness": "the verses show that a gentle answer is strength under control",
      "REFRAME.selfcontrol": "the verses show that holding back is a quiet kind of strength",
      "REFRAME.renewal": "the verses don't erase the past; they point to mercy that is new and a way that opens ahead",
      "each_morning_read_slowly_once": "Each morning, read {{ref}} slowly once, at the same moment (with your first drink, or at the door).",
      "try_a_breath_prayer_each": "Try a breath prayer each evening: breathe in slowly, then read {{ref}} on a long breath out.",
      "write_on_a_card_and": "Write {{ref}} on a card and read it at one set moment a day, like lunch.",
      // together()
      "together.wanting_to_pull_back": "wanting to pull back",
      "together.you_are_carrying_right_now": "You are carrying {{v0}} {{feel_s}} right now, and that makes sense: {{v2}}.",
      "together.things_feel_fairly_settled_right": "Things feel fairly settled right now, and that is worth noticing.",
      "together.these_verses_on_share_one": "These verses, on {{v0}}, share one thread: {{v1}}.",
      "together.toward.keeps_it_near_steady": "keeps it near steady",
      "together.toward.which_moves_it_a_little": "{{v0}} {{name}}, which moves it a little toward steady",
      "together.toward.may_move_it_a_little": "may move it a little toward steady",
      "together.one_gentle_step": "One gentle step, {{v0}}, ",
      "together.one_gentle_step_2": "One gentle step ",
      "together.your_inner_peace_is_now": "Your inner peace is {{v0}} now. {{v1}}{{toward}}; peace grows over days of small practice, not all at once.",
      "together.a_small_daily_habit": "A small daily habit: {{v0}}",
      // render()
      "render.scripture_for_this_moment": "Scripture for this moment: {{label}}",
      "render.verses_together": "Verses together",
      "render.keeps_a_verse_with_you": "{{name}} keeps a verse with you: “{{text}}” {{ref}} ({{TRANSLATION}})",
      "render.a_picture_to_steady_you": "A picture to steady you",
      "render.a_parable_of_peace": "A parable of peace",
      // scene()
      "scene.seeds_resting_in_water_above": "Seeds resting in water above a counter on a cornerstone; seed counter {{offset}}",
    },

    // ===== features/writer/comfort.js — "Comfort story from a public AI" (in Write a story). =====
    "writer.comfort": {
      // module level
      "ASK.please_write_a_short_gentle": "Please write a short, gentle, grounded comfort story (about 200 words) with a friendly animal as the main character, followed by three short first-person affirmations. ",
      "ASK.base_both_only_on_the": "Base both ONLY on the analysis below. Keep it warm and realistic, give no medical or diagnostic advice, and end on a hopeful note.",
      "ABOUT.the_analysis_comes_from_a": "The analysis comes from a small local equation model of nine feelings (a model, not a measurement or a diagnosis).",
      // numbers()
      "numbers.dir.biggest_move": "; biggest move: {{v0}} {{v1}} -> {{v2}}",
      "numbers.dir.distance_from_steady": "distance from steady {{v0}} -> {{v1}}{{j_s}}",
      // module level
      "vs_in_the_words": "{{a}} vs {{b}} (in the words) {{v2}}",
      "need_for": "need for {{b}}",
      // numbers()
      "numbers.step_direction": "Step direction: {{dir}}",
      "numbers.hidden_conflicts": "Hidden conflicts: {{v0}}",
      "numbers.grandiosity_signal": "Grandiosity signal: {{v0}}{{v1}}",
      "numbers.positive_emotions_it_points_toward": "Positive emotions it points toward: {{v0}}",
      "numbers.not_reached": "not reached",
      "numbers.inner_peace_p_steps_until": "Inner peace P: {{v0}} ({{v1}}); steps until P >= 0.80: {{v2}}; biggest lever: {{v3}}",
      "numbers.forgiving_yourself": "forgiving yourself",
      "numbers.forgiving_someone": "forgiving someone",
      "numbers.forgiveness_self_f_others_f": "Forgiveness: self F={{v0}}, others F={{v1}} (threshold 0.35); suggested path: {{v2}}",
      "numbers.chosen_in_the_feelings_picker": " (chosen in the feelings picker)",
      "numbers.putting_yourself_down_false_humility": "Putting yourself down (false humility) signal: {{v0}}{{v1}}",
      "numbers.freeing_mix_inner_peace_shame": "Freeing mix (inner peace {{v0}} -> {{v1}}, shame only goes down): {{v2}}",
      "numbers.practice_for_the_one_step": "Practice for the one step: {{name}}",
      "numbers.steadiness_under_outside_criticism_kai": "Steadiness under outside criticism (Kai shield): pressure X={{v0}}, shield S={{v1}} (self-awareness {{v2}}, forbearance {{v3}}, empathy {{v4}}, respect guard {{v5}}); impulsive reaction I={{v6}}; weakest: {{v7}}",
      // buildPrompt()
      "buildPrompt.words.how_they_connect": "- How they connect: {{v0}}",
      "buildPrompt.words.suggested_step": "- Suggested step: {{step}}",
      "buildPrompt.words.affirmations_the_app_composed": "- Affirmations the app composed: {{v0}}",
      "buildPrompt.out.in_words": "In words:",
      "buildPrompt.out.numbers_0_to_1": "Numbers (0 to 1):",
      "buildPrompt.if_the_story_touches_forgiveness": "If the story touches forgiveness, keep it gentle and unhurried: forgiving is not excusing what happened, reconciling, or staying anywhere unsafe.",
      "buildPrompt.companion_please_make_the_friendly": "Companion: please make the friendly animal my companion, a little {{v0}} named {{name}} ({{v2}} stage), gentle and kind.",
      "buildPrompt.faith_please_include_one_gentle": "Faith: please include one gentle line of Christian faith, for example the peace of God that surpasses understanding (Philippians 4:7).",
    },

    // ===== features/writer/writer.js — "Write a story" (was Fern the Fox, the Writer). =====
    "writer.writer": {
      // module level
      "STEP_FOR.connection": "send one short message to someone who is kind",
      "STEP_FOR.hope": "pick one small thing for tomorrow and write it down",
      // story()
      "story.tag": "{{traveler}}, a traveler who stands calm in a storm of words",
      "story.helper.they_knew_it_so_the": "They knew {{v0}} {{v1}} it, so the plan stayed small and real.",
      "story.helper.the_plan_stayed_small_and": "The plan stayed small and real.",
      "story.subject.the_urge_to_look_away": "the urge to look away",
      "story.room.there_was_room_for_now": " There was room for {{v0}} now.",
      "story.loosen.not_all_the_way_just": "{{v0}} {{v1}}{{moved_s}}. Not all the way. Just closer.{{room}}",
      "story.keep.they_kept_one_sentence_close": "They kept one sentence close: “{{aff}}”",
      // tell()
      "tell.you_re_close_to_steady": "You're close to steady; there's no story to tell right now.",
      // module level
      "step_accepted_and_saved_as": "Step accepted and saved as a checkpoint. The next reading starts from here.",
      // scene()
      "scene.you_found_the_real_path": "You found the real path",
      "scene.scene_of_four": "Scene {{v0}} of four",
      // module level
      "write_something_above_to_save": "Write something above to save it in your journal.",
      "clear_every_journal_entry_on": "Clear every journal entry on this device?",
      // render()
      "render.nothing_kept_yet": "Nothing kept yet.",
    },
  };
  const FLAT = {};
  Object.keys(S).forEach(g => Object.keys(S[g]).forEach(k => { FLAT[g + "." + k] = S[g][k]; }));
  function get(key) { if (!(key in FLAT)) throw new Error("MindFrame string missing: " + key); return FLAT[key]; }
  /** t(key, vars): the string for key, with {{name}} filled from vars. */
  // Templates are split once into [text, name, text, name, …] and joined per call (push28: no regex per call).
  const PARTS = new Map();
  function t(key, vars) {
    const s = get(key);
    if (typeof s !== "string") throw new Error("MindFrame string is a list, use Str.list: " + key);
    if (!vars) return s;
    let parts = PARTS.get(key);
    if (!parts) { parts = s.split(/\{\{(\w+)\}\}/); PARTS.set(key, parts); }
    let out = parts[0];
    for (let i = 1; i < parts.length; i += 2) out += String(vars[parts[i]]) + parts[i + 1];
    return out;
  }
  /** list(key): a fresh copy of a list of strings. */
  function list(key) { const s = get(key); if (!Array.isArray(s)) throw new Error("not a list: " + key); return s.slice(); }
  const has = key => key in FLAT, keys = () => Object.keys(FLAT);
  /** Fill index.html's static labels from the html group. */
  function apply(root) {
    root.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
    ["placeholder", "aria-label", "title"].forEach(a => root.querySelectorAll("[data-t-" + a + "]").forEach(el => el.setAttribute(a, t(el.getAttribute("data-t-" + a)))));
  }
  MF.Strings = { S, t, list, has, keys, apply, raw: get };
  MF.t = t;
  // strings.js loads first, at the end of <body>, so the page's labels are filled before any feature runs.
  if (typeof document !== "undefined") apply(document);
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Strings;
