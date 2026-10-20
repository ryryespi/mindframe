// features/credits.js — Credits: the researchers and sources MindFrame stands on.
//
// Offline, read-only. Every entry was checked in October 2026: journal articles
// against Crossref (title, authors, year, volume, pages, DOI), books against Open
// Library or publisher and library catalogs, and reports, preprints, archives and
// web articles at their source. Entries that could not be fully verified are kept
// but marked "flagged" with the reason; nothing was made up. Films are credited to
// their studios and filmmakers, and songs to their artists and writers; MindFrame
// only names them and quotes no lyrics.

(function (MF) {
  "use strict";

  const GRATITUDE = "With gratitude to every researcher, clinician, translator and writer listed here, whose careful work this small app stands on. All credit and glory to God.";
  const MEDIA = "Films are credited to their studios and filmmakers, and songs to their artists and songwriters. MindFrame names them only, links to public pages, and quotes no lyrics.";
  const CATEGORIES = ["Emotion, cognition and CBT", "DBT, ACT, mindfulness and compassion", "Forgiveness, virtue, gratitude and peace", "Relationships and belonging", "Body, writing and activity", "Inner speech, language and design", "Media", "Mathematics", "Philosophy and spiritual writers", "Time, dynamics, control and imagery", "Scripture and data"];
  /** {cat, cite, doi, status: "verified" | "flagged", how} */
  const ENTRIES = [
    {"cat": "Emotion, cognition and CBT", "cite": "Beck, A. T. (1976). Cognitive therapy and the emotional disorders. New York: International Universities Press.", "doi": null, "status": "verified", "how": "Open Library (International Universities Press, 1976)"},
    {"cat": "Emotion, cognition and CBT", "cite": "Beck, A. T., Rush, A. J., Shaw, B. F., & Emery, G. (1979). Cognitive Therapy of Depression. New York: Guilford Press.", "doi": null, "status": "verified", "how": "Open Library (Guilford, 1979)"},
    {"cat": "Emotion, cognition and CBT", "cite": "Beck, J. S. (2011). Cognitive Behavior Therapy: Basics and Beyond (2nd ed.). New York: Guilford Press.", "doi": null, "status": "verified", "how": "Open Library (Guilford, 2011, 2nd ed.)"},
    {"cat": "Emotion, cognition and CBT", "cite": "Beck, A. T., Steer, R. A., Kovacs, M., & Garrison, B. (1985). Hopelessness and eventual suicide: A 10-year prospective study of patients hospitalized with suicidal ideation. American Journal of Psychiatry, 142, 559–563.", "doi": "10.1176/ajp.142.5.559", "status": "verified", "how": "Crossref, doi:10.1176/ajp.142.5.559"},
    {"cat": "Emotion, cognition and CBT", "cite": "Burns, D. D. (1980). Feeling good: The new mood therapy. New York: William Morrow.", "doi": null, "status": "verified", "how": "Wikipedia / Internet Archive (William Morrow, 1980)"},
    {"cat": "Emotion, cognition and CBT", "cite": "Gross, J. J. (1998). The emerging field of emotion regulation: An integrative review. Review of General Psychology, 2(3), 271–299.", "doi": "10.1037/1089-2680.2.3.271", "status": "verified", "how": "Crossref, doi:10.1037/1089-2680.2.3.271"},
    {"cat": "Emotion, cognition and CBT", "cite": "Aldao, A., Nolen-Hoeksema, S., & Schweizer, S. (2010). Emotion-regulation strategies across psychopathology: A meta-analytic review. Clinical Psychology Review, 30(2), 217–237.", "doi": "10.1016/j.cpr.2009.11.004", "status": "verified", "how": "Crossref, doi:10.1016/j.cpr.2009.11.004"},
    {"cat": "Emotion, cognition and CBT", "cite": "Barlow, D. H., Allen, L. B., & Choate, M. L. (2004). Toward a unified treatment for emotional disorders. Behavior Therapy, 35(2), 205–230.", "doi": "10.1016/s0005-7894(04)80036-4", "status": "verified", "how": "Crossref, doi:10.1016/s0005-7894(04)80036-4"},
    {"cat": "Emotion, cognition and CBT", "cite": "Nolen-Hoeksema, S., Wisco, B. E., & Lyubomirsky, S. (2008). Rethinking rumination. Perspectives on Psychological Science, 3(5), 400–424.", "doi": "10.1111/j.1745-6924.2008.00088.x", "status": "verified", "how": "Crossref, doi:10.1111/j.1745-6924.2008.00088.x"},
    {"cat": "Emotion, cognition and CBT", "cite": "Al-Mosaiwi, M., & Johnstone, T. (2018). In an absolute state: Elevated use of absolutist words is a marker specific to anxiety, depression, and suicidal ideation. Clinical Psychological Science, 6(4), 529–542.", "doi": "10.1177/2167702617747074", "status": "verified", "how": "Crossref, doi:10.1177/2167702617747074"},
    {"cat": "Emotion, cognition and CBT", "cite": "Kim, S., Thibodeau, R., & Jorgensen, R. S. (2011). Shame, guilt, and depressive symptoms: A meta-analytic review. Psychological Bulletin, 137(1), 68–96.", "doi": "10.1037/a0021466", "status": "verified", "how": "Crossref, doi:10.1037/a0021466"},
    {"cat": "Emotion, cognition and CBT", "cite": "Hofmann, S. G., Asnaani, A., Vonk, I. J. J., Sawyer, A. T., & Fang, A. (2012). The efficacy of cognitive behavioral therapy: A review of meta-analyses. Cognitive Therapy and Research, 36(5), 427–440.", "doi": "10.1007/s10608-012-9476-1", "status": "verified", "how": "Crossref, doi:10.1007/s10608-012-9476-1"},
    {"cat": "Emotion, cognition and CBT", "cite": "Lieberman, M. D., Eisenberger, N. I., Crockett, M. J., Tom, S. M., Pfeifer, J. H., & Way, B. M. (2007). Putting feelings into words: Affect labeling disrupts amygdala activity in response to affective stimuli. Psychological Science, 18(5), 421–428.", "doi": "10.1111/j.1467-9280.2007.01916.x", "status": "verified", "how": "Crossref doi:10.1111/j.1467-9280.2007.01916.x"},
    {"cat": "Emotion, cognition and CBT", "cite": "Snyder, C. R. (2002). Hope theory: Rainbows in the mind. Psychological Inquiry, 13(4), 249–275.", "doi": "10.1207/s15327965pli1304_01", "status": "verified", "how": "Crossref doi:10.1207/s15327965pli1304_01"},
    {"cat": "Emotion, cognition and CBT", "cite": "Wolpe, J. (1969). The Practice of Behavior Therapy. New York: Pergamon Press.", "doi": null, "status": "verified", "how": "Open Library (Pergamon, 1969)"},
    {"cat": "Emotion, cognition and CBT", "cite": "Rachman, S., & de Silva, P. (1978). Abnormal and normal obsessions. Behaviour Research and Therapy, 16(4), 233–248.", "doi": "10.1016/0005-7967(78)90022-0", "status": "verified", "how": "Crossref, doi:10.1016/0005-7967(78)90022-0"},
    {"cat": "Emotion, cognition and CBT", "cite": "Holmes, E. A., & Mathews, A. (2010). Mental imagery in emotion and emotional disorders. Clinical Psychology Review, 30(3), 349–362.", "doi": "10.1016/j.cpr.2010.01.001", "status": "verified", "how": "Crossref, doi:10.1016/j.cpr.2010.01.001"},
    {"cat": "Emotion, cognition and CBT", "cite": "Wegner, D. M., Schneider, D. J., Carter, S. R., & White, T. L. (1987). Paradoxical effects of thought suppression. Journal of Personality and Social Psychology, 53(1), 5–13.", "doi": "10.1037/0022-3514.53.1.5", "status": "verified", "how": "Crossref, doi:10.1037/0022-3514.53.1.5"},
    {"cat": "Emotion, cognition and CBT", "cite": "Borkovec, T. D., Wilkinson, L., Folensbee, R., & Lerman, C. (1983). Stimulus control applications to the treatment of worry. Behaviour Research and Therapy, 21(3), 247–251.", "doi": "10.1016/0005-7967(83)90206-1", "status": "verified", "how": "Crossref, doi:10.1016/0005-7967(83)90206-1"},
    {"cat": "Emotion, cognition and CBT", "cite": "McGowan, S. K., & Behar, E. (2013). A preliminary investigation of stimulus control training for worry: Effects on anxiety and insomnia. Behavior Modification, 37(1), 90–112.", "doi": "10.1177/0145445512455661", "status": "verified", "how": "Crossref doi:10.1177/0145445512455661 (online 2012, issue 2013)"},
    {"cat": "Emotion, cognition and CBT", "cite": "King, L. A. (2001). The health benefits of writing about life goals. Personality and Social Psychology Bulletin, 27(7), 798–807.", "doi": "10.1177/0146167201277003", "status": "verified", "how": "Crossref, doi:10.1177/0146167201277003"},
    {"cat": "Emotion, cognition and CBT", "cite": "Peters, M. L., Flink, I. K., Boersma, K., & Linton, S. J. (2010). Manipulating optimism: Can imagining a best possible self be used to increase positive future expectancies? The Journal of Positive Psychology, 5(3), 204–211.", "doi": "10.1080/17439761003790963", "status": "verified", "how": "Crossref, doi:10.1080/17439761003790963"},
    {"cat": "Emotion, cognition and CBT", "cite": "Hershfield, H. E. (2011). Future self-continuity: How conceptions of the future self transform intertemporal choice. Annals of the New York Academy of Sciences, 1235, 30–43.", "doi": "10.1111/j.1749-6632.2011.06201.x", "status": "verified", "how": "Crossref, doi:10.1111/j.1749-6632.2011.06201.x"},
    {"cat": "Emotion, cognition and CBT", "cite": "Oettingen, G. (2014). Rethinking Positive Thinking: Inside the New Science of Motivation. New York: Current.", "doi": null, "status": "verified", "how": "Publisher listings (Current, 2014)"},
    {"cat": "Emotion, cognition and CBT", "cite": "American Psychiatric Association. (2013). Diagnostic and Statistical Manual of Mental Disorders (5th ed.). Arlington, VA: APA.", "doi": "10.1176/appi.books.9780890425596", "status": "verified", "how": "Crossref, doi:10.1176/appi.books.9780890425596"},
    {"cat": "Emotion, cognition and CBT", "cite": "Kroenke, K., Strine, T. W., Spitzer, R. L., Williams, J. B. W., Berry, J. T., & Mokdad, A. H. (2009). The PHQ-8 as a measure of current depression in the general population. Journal of Affective Disorders, 114(1–3), 163–173.", "doi": "10.1016/j.jad.2008.06.026", "status": "verified", "how": "Crossref, doi:10.1016/j.jad.2008.06.026"},
    {"cat": "Emotion, cognition and CBT", "cite": "Shiffman, S., Stone, A. A., & Hufford, M. R. (2008). Ecological momentary assessment. Annual Review of Clinical Psychology, 4, 1–32.", "doi": "10.1146/annurev.clinpsy.3.022806.091415", "status": "verified", "how": "Crossref, doi:10.1146/annurev.clinpsy.3.022806.091415"},
    {"cat": "Emotion, cognition and CBT", "cite": "Dawes, R. M. (1979). The robust beauty of improper linear models in decision making. American Psychologist, 34(7), 571–582.", "doi": "10.1037/0003-066x.34.7.571", "status": "verified", "how": "Crossref, doi:10.1037/0003-066x.34.7.571"},
    {"cat": "Emotion, cognition and CBT", "cite": "Kravitz, R. L., Duan, N., & the DEcIDE Methods Center N-of-1 Guidance Panel (Eds.). (2014). Design and Implementation of N-of-1 Trials: A User's Guide. Rockville, MD: Agency for Healthcare Research and Quality.", "doi": null, "status": "verified", "how": "AHRQ Effective Health Care (Publication No. 13(14)-EHC122-EF, 2014)"},
    {"cat": "Emotion, cognition and CBT", "cite": "Fitzpatrick, K. K., Darcy, A., & Vierhile, M. (2017). Delivering cognitive behavior therapy to young adults with symptoms of depression and anxiety using a fully automated conversational agent (Woebot): A randomized controlled trial. JMIR Mental Health, 4(2), e19.", "doi": "10.2196/mental.7785", "status": "verified", "how": "Crossref, doi:10.2196/mental.7785"},
    {"cat": "Emotion, cognition and CBT", "cite": "Cohen, G. L., & Sherman, D. K. (2014). The psychology of change: Self-affirmation and social psychological intervention. Annual Review of Psychology, 65, 333–371.", "doi": "10.1146/annurev-psych-010213-115137", "status": "verified", "how": "Crossref, doi:10.1146/annurev-psych-010213-115137"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Linehan, M. M. (1993). Cognitive-Behavioral Treatment of Borderline Personality Disorder. New York: Guilford Press.", "doi": null, "status": "verified", "how": "Open Library (Guilford, 1993)"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Linehan, M. M. (2015). DBT skills training manual (2nd ed.). New York: Guilford Press. (TIP skills: Temperature).", "doi": null, "status": "verified", "how": "Open Library (Guilford, 2nd ed., 2014/2015)"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Neacsiu, A. D., Rizvi, S. L., & Linehan, M. M. (2010). Dialectical behavior therapy skills use as a mediator and outcome of treatment for borderline personality disorder. Behaviour Research and Therapy, 48(9), 832–839.", "doi": "10.1016/j.brat.2010.05.017", "status": "verified", "how": "Crossref, doi:10.1016/j.brat.2010.05.017"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Neacsiu, A. D., Rizvi, S. L., Vitaliano, P. P., Lynch, T. R., & Linehan, M. M. (2010). The Dialectical Behavior Therapy Ways of Coping Checklist: Development and psychometric properties. Journal of Clinical Psychology, 66(6), 563–582.", "doi": "10.1002/jclp.20685", "status": "verified", "how": "Crossref, doi:10.1002/jclp.20685"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Hayes, S. C., Luoma, J. B., Bond, F. W., Masuda, A., & Lillis, J. (2006). Acceptance and commitment therapy: Model, processes and outcomes. Behaviour Research and Therapy, 44(1), 1–25.", "doi": "10.1016/j.brat.2005.06.006", "status": "verified", "how": "Crossref, doi:10.1016/j.brat.2005.06.006"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (2012). Acceptance and Commitment Therapy: The Process and Practice of Mindful Change (2nd ed.). New York: Guilford Press.", "doi": null, "status": "verified", "how": "Open Library (Guilford, 2nd ed., 2011/2012)"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Masuda, A., Hayes, S. C., Sackett, C. F., & Twohig, M. P. (2004). Cognitive defusion and self-relevant negative thoughts: Examining the impact of a ninety year old technique. Behaviour Research and Therapy, 42(4), 477–485.", "doi": "10.1016/j.brat.2003.10.008", "status": "verified", "how": "Crossref, doi:10.1016/j.brat.2003.10.008"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Bond, F. W., et al. (2011). Preliminary psychometric properties of the Acceptance and Action Questionnaire–II. Behavior Therapy, 42(4), 676–688.", "doi": "10.1016/j.beth.2011.03.007", "status": "verified", "how": "Crossref doi:10.1016/j.beth.2011.03.007"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Gillanders, D. T., et al. (2014). The development and initial validation of the Cognitive Fusion Questionnaire. Behavior Therapy, 45(1), 83–101.", "doi": "10.1016/j.beth.2013.09.001", "status": "verified", "how": "Crossref, doi:10.1016/j.beth.2013.09.001"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Kabat-Zinn, J. (1990). Full catastrophe living. New York: Delacorte.", "doi": null, "status": "verified", "how": "Open Library (Delacorte, 1990)"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Kabat-Zinn, J. (2003). Mindfulness-based interventions in context: Past, present, and future. Clinical Psychology: Science and Practice, 10(2), 144–156.", "doi": "10.1093/clipsy.bpg016", "status": "verified", "how": "Crossref, doi:10.1093/clipsy.bpg016"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Segal, Z. V., Williams, J. M. G., & Teasdale, J. D. (2013). Mindfulness-based cognitive therapy for depression (2nd ed.). New York: Guilford Press.", "doi": null, "status": "verified", "how": "Library catalogs (Guilford, 2nd ed., 2013)"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Stahl, B., & Goldstein, E. (2010). A mindfulness-based stress reduction workbook. Oakland, CA: New Harbinger.", "doi": null, "status": "verified", "how": "Open Library (New Harbinger, 2010)"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Desbordes, G., Gard, T., Hoge, E. A., Hölzel, B. K., Kerr, C., Lazar, S. W., Olendzki, A., & Vago, D. R. (2015). Moving beyond mindfulness: Defining equanimity as an outcome measure in meditation and contemplative research. Mindfulness, 6(2), 356–372.", "doi": "10.1007/s12671-013-0269-8", "status": "verified", "how": "Crossref, doi:10.1007/s12671-013-0269-8"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Neff, K. D. (2003). Self-compassion: An alternative conceptualization of a healthy attitude toward oneself. Self and Identity, 2(2), 85–101.", "doi": "10.1080/15298860309032", "status": "verified", "how": "Crossref, doi:10.1080/15298860309032"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Gilbert, P. (2009). Introducing compassion-focused therapy. Advances in Psychiatric Treatment, 15(3), 199–208.", "doi": "10.1192/apt.bp.107.005264", "status": "verified", "how": "Crossref, doi:10.1192/apt.bp.107.005264"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Gilbert, P., & Procter, S. (2006). Compassionate mind training for people with high shame and self-criticism: Overview and pilot study of a group therapy approach. Clinical Psychology & Psychotherapy, 13(6), 353–379.", "doi": "10.1002/cpp.507", "status": "verified", "how": "Crossref, doi:10.1002/cpp.507"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Hofmann, S. G., Grossman, P., & Hinton, D. E. (2011). Loving-kindness and compassion meditation: Potential for psychological interventions. Clinical Psychology Review, 31(7), 1126–1132.", "doi": "10.1016/j.cpr.2011.07.003", "status": "verified", "how": "Crossref, doi:10.1016/j.cpr.2011.07.003"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Bowen, S., & Marlatt, A. (2009). Surfing the urge: Brief mindfulness-based intervention for college student smokers. Psychology of Addictive Behaviors, 23(4), 666–671.", "doi": "10.1037/a0017127", "status": "verified", "how": "Crossref, doi:10.1037/a0017127"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Miller, W. R., & Rollnick, S. (2013). Motivational interviewing: Helping people change (3rd ed.). New York: Guilford Press.", "doi": null, "status": "verified", "how": "Open Library (Guilford, 3rd ed., 2012/2013)"},
    {"cat": "DBT, ACT, mindfulness and compassion", "cite": "Zaccaro, A., et al. (2018). How breath-control can change your life: A systematic review on psycho-physiological correlates of slow breathing. Frontiers in Human Neuroscience, 12, 353.", "doi": "10.3389/fnhum.2018.00353", "status": "verified", "how": "Crossref, doi:10.3389/fnhum.2018.00353"},
    {"cat": "Forgiveness, virtue, gratitude and peace", "cite": "Cornish, M. A., & Wade, N. G. (2015). A therapeutic model of self-forgiveness with intervention strategies for counselors. Journal of Counseling & Development, 93(1), 96–104.", "doi": "10.1002/j.1556-6676.2015.00185.x", "status": "verified", "how": "Crossref, doi:10.1002/j.1556-6676.2015.00185.x"},
    {"cat": "Forgiveness, virtue, gratitude and peace", "cite": "Worthington, E. L., Jr. (2006). Forgiveness and reconciliation: Theory and application. New York: Routledge.", "doi": null, "status": "verified", "how": "Open Library (Routledge, 2006)"},
    {"cat": "Forgiveness, virtue, gratitude and peace", "cite": "Wade, N. G., Hoyt, W. T., Kidwell, J. E. M., & Worthington, E. L., Jr. (2014). Efficacy of psychotherapeutic interventions to promote forgiveness: A meta-analysis. Journal of Consulting and Clinical Psychology, 82(1), 154–170.", "doi": "10.1037/a0035268", "status": "verified", "how": "Crossref, doi:10.1037/a0035268"},
    {"cat": "Forgiveness, virtue, gratitude and peace", "cite": "Enright, R. D., & Fitzgibbons, R. P. (2015). Forgiveness therapy: An empirical guide for resolving anger and restoring hope. Washington, DC: APA.", "doi": "10.1037/14526-000", "status": "verified", "how": "Crossref, doi:10.1037/14526-000"},
    {"cat": "Forgiveness, virtue, gratitude and peace", "cite": "McCullough, M. E., Bono, G., & Root, L. M. (2007). Rumination, emotion, and forgiveness: Three longitudinal studies. Journal of Personality and Social Psychology, 92(3), 490–505.", "doi": "10.1037/0022-3514.92.3.490", "status": "verified", "how": "Crossref, doi:10.1037/0022-3514.92.3.490"},
    {"cat": "Forgiveness, virtue, gratitude and peace", "cite": "Emmons, R. A., & McCullough, M. E. (2003). Counting blessings versus burdens: An experimental investigation of gratitude and subjective well-being in daily life. Journal of Personality and Social Psychology, 84(2), 377–389.", "doi": "10.1037/0022-3514.84.2.377", "status": "verified", "how": "Crossref, doi:10.1037/0022-3514.84.2.377"},
    {"cat": "Forgiveness, virtue, gratitude and peace", "cite": "Schnitker, S. A. (2012). An examination of patience and well-being. The Journal of Positive Psychology, 7(4), 263–280.", "doi": "10.1080/17439760.2012.697185", "status": "verified", "how": "Crossref, doi:10.1080/17439760.2012.697185"},
    {"cat": "Forgiveness, virtue, gratitude and peace", "cite": "Tangney, J. P. (2000). Humility: Theoretical perspectives, empirical findings and directions for future research. Journal of Social and Clinical Psychology, 19(1), 70–82.", "doi": "10.1521/jscp.2000.19.1.70", "status": "verified", "how": "Crossref, doi:10.1521/jscp.2000.19.1.70"},
    {"cat": "Forgiveness, virtue, gratitude and peace", "cite": "Lee, Y.-C., Lin, Y.-C., Huang, C.-L., & Fredrickson, B. L. (2013). The construct and measurement of peace of mind. Journal of Happiness Studies, 14(2), 571–590.", "doi": "10.1007/s10902-012-9343-5", "status": "verified", "how": "Crossref, doi:10.1007/s10902-012-9343-5"},
    {"cat": "Forgiveness, virtue, gratitude and peace", "cite": "Davis, M. H. (1983). Measuring individual differences in empathy: Evidence for a multidimensional approach. Journal of Personality and Social Psychology, 44(1), 113–126.", "doi": "10.1037/0022-3514.44.1.113", "status": "verified", "how": "Crossref, doi:10.1037/0022-3514.44.1.113"},
    {"cat": "Forgiveness, virtue, gratitude and peace", "cite": "Speed, B. C., Goldstein, B. L., & Goldfried, M. R. (2018). Assertiveness training: A forgotten evidence-based treatment. Clinical Psychology: Science and Practice, 25(1), e12216.", "doi": "10.1111/cpsp.12216", "status": "verified", "how": "Crossref, doi:10.1111/cpsp.12216"},
    {"cat": "Relationships and belonging", "cite": "Gottman, J. M. (1994). What predicts divorce? The relationship between marital processes and marital outcomes. Hillsdale, NJ: Erlbaum.", "doi": null, "status": "verified", "how": "Open Library (Lawrence Erlbaum, 1994)"},
    {"cat": "Relationships and belonging", "cite": "Gottman, J. M., & Levenson, R. W. (1992). Marital processes predictive of later dissolution: Behavior, physiology, and health. Journal of Personality and Social Psychology, 63(2), 221–233.", "doi": "10.1037/0022-3514.63.2.221", "status": "verified", "how": "Crossref, doi:10.1037/0022-3514.63.2.221"},
    {"cat": "Relationships and belonging", "cite": "Gottman, J. M., & Levenson, R. W. (2000). The timing of divorce: Predicting when a couple will divorce over a 14-year period. Journal of Marriage and Family, 62(3), 737–745.", "doi": "10.1111/j.1741-3737.2000.00737.x", "status": "verified", "how": "Crossref, doi:10.1111/j.1741-3737.2000.00737.x"},
    {"cat": "Relationships and belonging", "cite": "Heyman, R. E., & Slep, A. M. S. (2001). The hazards of predicting divorce without crossvalidation. Journal of Marriage and Family, 63(2), 473–479.", "doi": "10.1111/j.1741-3737.2001.00473.x", "status": "verified", "how": "Crossref, doi:10.1111/j.1741-3737.2001.00473.x"},
    {"cat": "Relationships and belonging", "cite": "Holt-Lunstad, J., Smith, T. B., & Layton, J. B. (2010). Social relationships and mortality risk: A meta-analytic review. PLoS Medicine, 7(7), e1000316.", "doi": "10.1371/journal.pmed.1000316", "status": "verified", "how": "Crossref, doi:10.1371/journal.pmed.1000316"},
    {"cat": "Relationships and belonging", "cite": "Baumeister, R. F., & Leary, M. R. (1995). The need to belong: Desire for interpersonal attachments as a fundamental human motivation. Psychological Bulletin, 117(3), 497–529.", "doi": "10.1037/0033-2909.117.3.497", "status": "verified", "how": "Crossref, doi:10.1037/0033-2909.117.3.497"},
    {"cat": "Relationships and belonging", "cite": "Meng, X., Chen, Y., Wang, X., Yuan, J., & Yu, D. (2024). The relationship between school connectedness and depression: A three-level meta-analytic review. Advances in Psychological Science, 32(2), 246–263. (In Chinese with English abstract.).", "doi": "10.3724/sp.j.1042.2024.00246", "status": "verified", "how": "Crossref, doi:10.3724/sp.j.1042.2024.00246"},
    {"cat": "Body, writing and activity", "cite": "Jacobson, E. (1938). Progressive relaxation (2nd ed.). Chicago: University of Chicago Press.", "doi": null, "status": "verified", "how": "Open Library (University of Chicago Press, 1938 ed.)"},
    {"cat": "Body, writing and activity", "cite": "McCallie, M. S., Blum, C. M., & Hood, C. J. (2006). Progressive muscle relaxation. Journal of Human Behavior in the Social Environment, 13(3), 51–66.", "doi": "10.1300/j137v13n03_04", "status": "verified", "how": "Crossref, doi:10.1300/j137v13n03_04"},
    {"cat": "Body, writing and activity", "cite": "Pennebaker, J. W., & Beall, S. K. (1986). Confronting a traumatic event: Toward an understanding of inhibition and disease. Journal of Abnormal Psychology, 95(3), 274–281.", "doi": "10.1037/0021-843x.95.3.274", "status": "verified", "how": "Crossref, doi:10.1037/0021-843x.95.3.274"},
    {"cat": "Body, writing and activity", "cite": "Frattaroli, J. (2006). Experimental disclosure and its moderators: A meta-analysis. Psychological Bulletin, 132(6), 823–865. (146 studies; a small average effect, r ≈ .08).", "doi": "10.1037/0033-2909.132.6.823", "status": "verified", "how": "Crossref, doi:10.1037/0033-2909.132.6.823"},
    {"cat": "Body, writing and activity", "cite": "Ekkekakis, P., Hall, E. E., VanLanduyt, L. M., & Petruzzello, S. J. (2000). Walking in (affective) circles: Can short walks enhance affect? Journal of Behavioral Medicine, 23(3), 245–275.", "doi": "10.1023/a:1005558025163", "status": "verified", "how": "Crossref, doi:10.1023/a:1005558025163"},
    {"cat": "Body, writing and activity", "cite": "Rebar, A. L., Stanton, R., Geard, D., Short, C., Duncan, M. J., & Vandelanotte, C. (2015). A meta-meta-analysis of the effect of physical activity on depression and anxiety in non-clinical adult populations. Health Psychology Review, 9(3), 366–378.", "doi": "10.1080/17437199.2015.1022901", "status": "verified", "how": "Crossref, doi:10.1080/17437199.2015.1022901"},
    {"cat": "Inner speech, language and design", "cite": "Alderson-Day, B., & Fernyhough, C. (2015). Inner speech: Development, cognitive functions, phenomenology, and neurobiology. Psychological Bulletin, 141(5), 931–965.", "doi": "10.1037/bul0000021", "status": "verified", "how": "Crossref, doi:10.1037/bul0000021"},
    {"cat": "Inner speech, language and design", "cite": "Fernyhough, C. (2016). The Voices Within: The History and Science of How We Talk to Ourselves. New York: Basic Books.", "doi": null, "status": "verified", "how": "Open Library (Basic Books, 2016)"},
    {"cat": "Inner speech, language and design", "cite": "Kross, E., Bruehlman-Senecal, E., Park, J., et al. (2014). Self-talk as a regulatory mechanism: How you do it matters. Journal of Personality and Social Psychology, 106(2), 304–324.", "doi": "10.1037/a0035173", "status": "verified", "how": "Crossref, doi:10.1037/a0035173"},
    {"cat": "Inner speech, language and design", "cite": "Vygotsky, L. S. (1986). Thought and Language (A. Kozulin, Ed. & Trans.). Cambridge, MA: MIT Press. (Original work published 1934.).", "doi": null, "status": "verified", "how": "Open Library (MIT Press, 1986)"},
    {"cat": "Inner speech, language and design", "cite": "Whorf, B. L. (1956). Language, Thought, and Reality (J. B. Carroll, Ed.). Cambridge, MA: MIT Press.", "doi": null, "status": "verified", "how": "Open Library (MIT Press, 1956)"},
    {"cat": "Inner speech, language and design", "cite": "Boroditsky, L. (2001). Does language shape thought? Mandarin and English speakers' conceptions of time. Cognitive Psychology, 43(1), 1–22.", "doi": "10.1006/cogp.2001.0748", "status": "verified", "how": "Crossref doi:10.1006/cogp.2001.0748"},
    {"cat": "Inner speech, language and design", "cite": "Cowan, N. (2001). The magical number 4 in short-term memory: A reconsideration of mental storage capacity. Behavioral and Brain Sciences, 24(1), 87–114.", "doi": "10.1017/s0140525x01003922", "status": "verified", "how": "Crossref, doi:10.1017/s0140525x01003922"},
    {"cat": "Inner speech, language and design", "cite": "Miller, G. A. (1956). The magical number seven, plus or minus two: Some limits on our capacity for processing information. Psychological Review, 63(2), 81–97.", "doi": "10.1037/h0043158", "status": "verified", "how": "Crossref, doi:10.1037/h0043158"},
    {"cat": "Inner speech, language and design", "cite": "Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257–285.", "doi": "10.1207/s15516709cog1202_4", "status": "verified", "how": "Crossref, doi:10.1207/s15516709cog1202_4"},
    {"cat": "Inner speech, language and design", "cite": "Nielsen, J. (2006). Progressive disclosure. Nielsen Norman Group article, nngroup.com.", "doi": null, "status": "verified", "how": "nngroup.com/articles/progressive-disclosure (3 Dec 2006)"},
    {"cat": "Inner speech, language and design", "cite": "Weizenbaum, J. (1966). ELIZA–-A computer program for the study of natural language communication between man and machine. Communications of the ACM, 9(1), 36–45.", "doi": "10.1145/365153.365168", "status": "verified", "how": "Crossref, doi:10.1145/365153.365168"},
    {"cat": "Inner speech, language and design", "cite": "Bommasani, R., et al. (2021). On the opportunities and risks of foundation models. arXiv preprint arXiv:2108.07258.", "doi": "10.48550/arXiv.2108.07258", "status": "verified", "how": "arXiv:2108.07258 (doi:10.48550/arXiv.2108.07258)"},
    {"cat": "Media", "cite": "Zillmann, D. (1988). Mood management through communication choices. American Behavioral Scientist, 31(3), 327–340.", "doi": "10.1177/000276488031003005", "status": "verified", "how": "Crossref, doi:10.1177/000276488031003005"},
    {"cat": "Mathematics", "cite": "Langlands, R. P. (1967). Letter to André Weil. (Available via the Institute for Advanced Study's Langlands archive.).", "doi": null, "status": "verified", "how": "IAS Langlands archive, publications.ias.edu/rpl/paper/43"},
    {"cat": "Mathematics", "cite": "Gelbart, S. (1984). An elementary introduction to the Langlands program. Bulletin of the American Mathematical Society, 10(2), 177–219.", "doi": "10.1090/s0273-0979-1984-15237-6", "status": "verified", "how": "Crossref, doi:10.1090/s0273-0979-1984-15237-6"},
    {"cat": "Mathematics", "cite": "Wiles, A. (1995). Modular elliptic curves and Fermat's Last Theorem. Annals of Mathematics, 141(3), 443–551.", "doi": "10.2307/2118559", "status": "verified", "how": "Crossref, doi:10.2307/2118559"},
    {"cat": "Mathematics", "cite": "Frenkel, E. (2013). Love and Math: The Heart of Hidden Reality. New York: Basic Books.", "doi": null, "status": "verified", "how": "Open Library (Basic Books, 2013)"},
    {"cat": "Philosophy and spiritual writers", "cite": "Frankl, V. E. (2006). Man's Search for Meaning. Boston: Beacon Press. (Original work published 1946.).", "doi": null, "status": "verified", "how": "Beacon Press catalog (2006)"},
    {"cat": "Philosophy and spiritual writers", "cite": "Robertson, D. (2010). The Philosophy of Cognitive-Behavioural Therapy (CBT): Stoic Philosophy as Rational and Cognitive Psychotherapy. London: Karnac.", "doi": null, "status": "verified", "how": "Open Library (Karnac, 2010)"},
    {"cat": "Philosophy and spiritual writers", "cite": "Epictetus. (c. 125 CE). Enchiridion (Handbook). Various translations.", "doi": null, "status": "flagged", "how": "Classical work (Enchiridion); existence is certain, but the paper names no edition or translator, so no full citation can be verified."},
    {"cat": "Philosophy and spiritual writers", "cite": "Marcus Aurelius. (c. 170–180 CE). Meditations. Various translations.", "doi": null, "status": "flagged", "how": "Classical work (Meditations); existence is certain, but the paper names no edition or translator, so no full citation can be verified."},
    {"cat": "Philosophy and spiritual writers", "cite": "Teresa of Ávila. The interior castle (VI.10.7). In K. Kavanaugh & O. Rodriguez (Trans.), The collected works of St. Teresa of Avila (Vol. 2). Washington, DC: ICS Publications, 1980. (\"To be humble is to walk in truth.\").", "doi": null, "status": "verified", "how": "Open Library (ICS Publications, Collected Works vol. 2, 1980); Interior Castle VI.10.7"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Verduyn, P., & Lavrijsen, S. (2015). Which emotions last longest and why: The role of event importance and rumination. Motivation and Emotion, 39(1), 119–127.", "doi": "10.1007/s11031-014-9445-y", "status": "verified", "how": "Crossref, doi:10.1007/s11031-014-9445-y"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Verduyn, P., Delvaux, E., Van Coillie, H., Tuerlinckx, F., & Van Mechelen, I. (2009). Predicting the duration of emotional experience: Two experience sampling studies. Emotion, 9(1), 83–91.", "doi": "10.1037/a0014610", "status": "verified", "how": "Crossref, doi:10.1037/a0014610"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Kuppens, P., Allen, N. B., & Sheeber, L. B. (2010). Emotional inertia and psychological maladjustment. Psychological Science, 21(7), 984–991.", "doi": "10.1177/0956797610372634", "status": "verified", "how": "Crossref, doi:10.1177/0956797610372634"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Banach, S. (1922). Sur les opérations dans les ensembles abstraits et leur application aux équations intégrales. Fundamenta Mathematicae, 3, 133–181.", "doi": "10.4064/fm-3-1-133-181", "status": "verified", "how": "Crossref, doi:10.4064/fm-3-1-133-181"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Lyapunov, A. M. (1992). The general problem of the stability of motion (A. T. Fuller, Trans.). International Journal of Control, 55(3), 531–773. (Original work published 1892).", "doi": "10.1080/00207179208934253", "status": "verified", "how": "Crossref, doi:10.1080/00207179208934253"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Åström, K. J., & Murray, R. M. (2008). Feedback Systems: An Introduction for Scientists and Engineers. Princeton, NJ: Princeton University Press.", "doi": "10.1515/9781400828739", "status": "verified", "how": "Crossref, doi:10.1515/9781400828739"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Kaplan, S. (1995). The restorative benefits of nature: Toward an integrative framework. Journal of Environmental Psychology, 15(3), 169–182.", "doi": "10.1016/0272-4944(95)90001-2", "status": "verified", "how": "Crossref, doi:10.1016/0272-4944(95)90001-2"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Berman, M. G., Jonides, J., & Kaplan, S. (2008). The cognitive benefits of interacting with nature. Psychological Science, 19(12), 1207–1212.", "doi": "10.1111/j.1467-9280.2008.02225.x", "status": "verified", "how": "Crossref, doi:10.1111/j.1467-9280.2008.02225.x"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Curry, O. S., Rowland, L. A., Van Lissa, C. J., Zlotowitz, S., McAlaney, J., & Whitehouse, H. (2018). Happy to help? A systematic review and meta-analysis of the effects of performing acts of kindness on the well-being of the actor. Journal of Experimental Social Psychology, 76, 320–329.", "doi": "10.1016/j.jesp.2018.02.014", "status": "verified", "how": "Crossref, doi:10.1016/j.jesp.2018.02.014"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Lewinsohn, P. M. (1974). A behavioral approach to depression. In R. J. Friedman & M. M. Katz (Eds.), The psychology of depression: Contemporary theory and research (pp. 157–178). Washington, DC: V. H. Winston & Sons / Wiley.", "doi": null, "status": "verified", "how": "Open Library (Friedman & Katz, 1974) and published reference lists (pages also given as 157\u2013185)"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Martell, C. R., Addis, M. E., & Jacobson, N. S. (2001). Depression in context: Strategies for guided action. New York: W. W. Norton.", "doi": null, "status": "verified", "how": "Open Library (Martell, Addis & Jacobson, 2001)"},
    {"cat": "Time, dynamics, control and imagery", "cite": "Csikszentmihalyi, M. (1990). Flow: The psychology of optimal experience. New York: Harper & Row.", "doi": null, "status": "verified", "how": "Open Library (Csikszentmihalyi, 1990)"},
    {"cat": "Scripture and data", "cite": "World English Bible (public domain). eBible.org, eng-web_vpl.txt (sha256 52b92dc6…cd8c4).", "doi": null, "status": "verified", "how": "Downloaded from ebible.org; every verse is checked against it in the tests"},
    {"cat": "Scripture and data", "cite": "Wikidata (CC0), Wikimedia Foundation. Film titles, years and ids in the films list.", "doi": null, "status": "verified", "how": "wikidata.org; each film id checked when the list was made"},
    {"cat": "Scripture and data", "cite": "The Movie Database (TMDB) API, optional and off by default. This product uses the TMDB API but is not endorsed or certified by TMDB.", "doi": null, "status": "verified", "how": "themoviedb.org attribution terms"},
  ];

  /** Counts by status. */
  const counts = () => ({ verified: ENTRIES.filter(e => e.status === "verified").length, flagged: ENTRIES.filter(e => e.status === "flagged").length, total: ENTRIES.length });
  /** A plain-text line for one entry (the DOI as a doi.org link when there is one). */
  const line = e => `${e.cite}${e.doi ? ` https://doi.org/${e.doi}` : ""}${e.status === "flagged" ? " [flagged: " + e.how + "]" : ""}`;


  // ---------- Where ideas come from (push26): the attribution equation ----------
  // MindFrame's one-page model (core/master.js) split into 18 terms. Each term is
  // tagged only with credited sources that the code comments, the README mover
  // table or the papers name for it ("where"; tests check that each source's
  // surname appears in one of those files). A term may have no source: it is a
  // design assumption, and it says so.
  //   M = Σ_k τ_k,   Src(τ_k) ⊆ the 101 sources credited in push25 (ATTR; the push27
  //   time, control and imagery sources are credited too but are not in this map)
  //   share(s) = |{k : s ∈ Src(τ_k)}| / 18
  // share is a STRUCTURAL MAP (how many model terms a source informs), not an
  // effect size, not a validated weight, and not a ranking of importance.
  const T = (id, tex, plain, name, words, where, src) => ({ id, tex, plain, name, words, where, src });
  const TERMS = [
    T("t1", "e", "e", "The nine movers", "Which feelings and habits of mind are tracked: fear, sadness, anger, shame, calm, connection, hope, replaying and avoiding.", ["README.md"],
      ["Barlow, D. H.", "Beck, A. T., Steer", "Kim, S.", "Zaccaro", "Holt-Lunstad", "Snyder", "Aldao", "Nolen-Hoeksema", "Bond, F. W.", "Gillanders"]),
    T("t2", "n(\\text{text})", "n(text)", "Reading your words", "How words become the reading: thinking traps, absolute words and relationship patterns.", ["js/core/signals.js", "js/core/reality.js", "js/features/relationship.js"],
      ["Beck, A. T. (1976)", "Burns", "Al-Mosaiwi", "Gottman, J. M. (1994)", "Gottman, J. M., & Levenson, R. W. (1992)", "Gottman, J. M., & Levenson, R. W. (2000)", "Heyman"]),
    T("t3", "X", "X", "Outside hurt", "Criticism aimed at you, kept apart from harsh words you use yourself.", ["js/core/kai.js", "paper/MindFrame-One-Equation.tex"],
      ["Gottman, J. M., & Levenson, R. W. (1992)"]),
    T("t4", "S", "S", "The Kai shield", "Steadiness under pressure: self-awareness, patience, empathy and a respectful guard.", ["js/core/kai.js"],
      ["Lieberman", "Cohen", "Schnitker", "Davis", "Linehan, M. M. (2015)", "Speed"]),
    T("t5", "a(e)(h-e)", "a(e)(h−e)", "One gentle step home", "Each update moves a little toward home, more when far away. A design choice; no single source.", ["js/core/master.js"], []),
    T("t6", "b\\,s(e)", "b·s(e)", "Feelings feeding each other", "The small table of which feelings amplify or calm each other. Design assumptions; no single source.", ["js/core/movers.js"], []),
    T("t7", "P_d", "P_d", "Peace near home", "Peace as being close to home with nothing pulling hard, an even mind.", ["js/core/peace.js"],
      ["Desbordes", "Kabat-Zinn, J. (2003)"]),
    T("t8", "C", "C", "Hidden conflicts", "Two pulls at once, like wanting and fearing; mixed feelings are a normal part of change.", ["js/core/peace.js", "js/core/reality.js"],
      ["Lee, Y.-C.", "Miller, W. R."]),
    T("t9", "G", "G", "True size", "Thinking that is neither too big nor too small: true humility.", ["js/core/reality.js", "js/core/peace.js"],
      ["Beck, A. T. (1976)", "Burns", "Al-Mosaiwi", "Tangney", "Neff", "Gilbert, P., & Procter", "Gilbert, P. (2009)", "Gross"]),
    T("t10", "\\ell", "ℓ", "The lever", "The one place where a small step helps most.", ["js/core/peace.js"], ["Gross"]),
    T("t11", "\\mathrm{practice}(\\ell)", "practice(ℓ)", "The practice", "The step you are offered: breathing, labeling, kindness to yourself, a walk, writing and more.", ["js/features/practices.js"],
      ["Stahl", "Segal", "Kabat-Zinn, J. (1990)", "Lieberman", "Neff", "Zaccaro", "Gross", "Schnitker", "Bowen", "Emmons", "Linehan, M. M. (2015)", "Jacobson", "McCallie", "Pennebaker", "Frattaroli", "Rebar", "Ekkekakis"]),
    T("t12", "F", "F", "Forgiveness", "Forgiving yourself and forgiving someone else, step by step.", ["js/features/forgiveness.js"],
      ["Cornish", "Neff", "Worthington", "Wade, N. G., Hoyt", "Enright", "McCullough, M. E., Bono"]),
    T("t13", "J", "J", "The freeing mix", "The gentlest mix of feelings to aim for, in true size.", ["js/features/freeing.js"],
      ["Tangney", "Burns", "Neff", "Gilbert, P., & Procter", "Gilbert, P. (2009)", "Teresa of Ávila"]),
    T("t14", "x(1-L)", "x(1−L)", "Loosen the grip", "Loosening a thought's hold without pushing it away.", ["js/features/grip.js"],
      ["Wegner", "Bowen", "Borkovec", "McGowan", "Masuda"]),
    T("t15", "\\Pi", "Π", "Past to future", "From what happened toward what can grow.", ["js/features/past.js"],
      ["Neff", "Cornish", "Hofmann, S. G., Grossman", "Hayes, S. C., Luoma", "King, L. A.", "Peters, M. L.", "Hershfield"]),
    T("t16", "\\sigma", "σ", "Scripture seed", "With faith on, the verses chosen for this moment.", ["js/features/scripture.js"], ["World English Bible"]),
    T("t17", "\\mathrm{story}", "story", "Continue your story", "Films and songs that continue the parable (credited to their studios and artists).", ["js/features/movies.js"],
      ["Zillmann", "Wikidata", "The Movie Database"]),
    T("t18", "\\mathrm{words}", "words", "The words you read", "Short, plain words first, with the numbers behind Show the math.", ["js/core/words.js", "paper/MindFrame-Grace-Peace-Paper.tex"],
      ["Burns", "Miller, W. R.", "Alderson-Day", "Fernyhough, C. (2016)", "Vygotsky", "Kross", "Cowan", "Miller, G. A.", "Sweller", "Nielsen"]),
  ];
  const SHARE_LABEL = "structural map, not effect size or validated weight";
  const MERGED_TEX = "\\mathcal{M}=\\mathrm{words}_{\\tau_{18}}\\Big(e'=\\mathrm{clip}\\big(e+\\underbrace{a(e)(h-e)}_{\\tau_5}+\\underbrace{b\\,s(e)}_{\\tau_6}\\big),\\ e=\\mathrm{clip}\\big(\\underbrace{e_-}_{\\tau_1}\\oplus\\underbrace{n(\\text{text})}_{\\tau_2}+\\underbrace{X}_{\\tau_3}(1-\\underbrace{S}_{\\tau_4})w\\big),\\ P=\\underbrace{P_d}_{\\tau_7}(1-\\gamma\\underbrace{C}_{\\tau_8})(1-\\delta\\underbrace{G}_{\\tau_9}),\\ \\underbrace{\\ell}_{\\tau_{10}}\\mapsto\\underbrace{\\mathrm{practice}(\\ell)}_{\\tau_{11}},\\ \\underbrace{F}_{\\tau_{12}},\\underbrace{J}_{\\tau_{13}},\\underbrace{x(1-L)}_{\\tau_{14}},\\underbrace{\\Pi}_{\\tau_{15}},\\underbrace{\\sigma}_{\\tau_{16}},\\underbrace{\\mathrm{story}}_{\\tau_{17}}\\Big),\\quad \\tau_k\\leftarrow\\sum_{s\\in\\mathrm{Src}(\\tau_k)} s,\\quad \\mathrm{share}(s)=\\frac{|\\{k: s\\in\\mathrm{Src}(\\tau_k)\\}|}{18}";
  const MERGED_PLAIN = "M = words_τ18( e' = clip(e + a(e)(h−e)_τ5 + b·s(e)_τ6),  e = clip(e₋_τ1 ⊕ n(text)_τ2 + X_τ3·(1 − S_τ4)·w),  P = P_d_τ7·(1 − γ·C_τ8)·(1 − δ·G_τ9),  ℓ_τ10 → practice(ℓ)_τ11,  F_τ12, J_τ13, x(1−L)_τ14, Π_τ15, σ_τ16, story_τ17 );  τ_k ← Σ sources of τ_k;  share(s) = (terms s informs) / 18";

  /** The entry a source key (a unique cite prefix) names; throws if it is missing or ambiguous. */
  function entry(key) {
    const m = ENTRIES.filter(e => e.cite.startsWith(key));
    if (m.length !== 1) throw new Error(`source key "${key}" matches ${m.length} entries`);
    return m[0];
  }
  /** A short author-year label, e.g. "Neff 2003", "Cornish & Wade 2015", "Hofmann et al. 2011". */
  function label(e) {
    const SPECIAL = { "World English Bible": "World English Bible", "Wikidata": "Wikidata", "The Movie Database": "TMDB", "Teresa of Ávila": "Teresa of Ávila" };
    for (const k in SPECIAL) if (e.cite.startsWith(k)) return SPECIAL[k];
    const y = (e.cite.match(/\((\d{4})\)/) || [])[1];
    const head = e.cite.split(/\s\(\d{4}\)/)[0];
    const names = head.replace(/,? et al\.?/, "").split(/,\s*(?:&\s*)?|\s&\s/).map(x => x.trim()).filter(x => x && !/^([A-Z]\.\s?-?)+([A-Z]\.)?$|^Jr\.?$|^the /.test(x) && !/^[A-Z]\.( [A-Z]\.)*$/.test(x));
    const many = names.length > 2 || /et al/.test(head);
    return `${names[0]}${many ? " et al." : names.length === 2 ? " & " + names[1] : ""} ${y}`;
  }
  /** Per source: the terms it informs and its structural share. Sorted by share, then label. */
  function contributions() {
    const by = new Map();
    TERMS.forEach(t => t.src.forEach(k => { const e = entry(k); if (!by.has(e)) by.set(e, []); by.get(e).push(t.id); }));
    return [...by].map(([e, terms]) => ({ label: label(e), cite: e.cite, terms, share: Math.round(terms.length / TERMS.length * 1000) / 1000 }))
      .sort((a, b) => b.share - a.share || a.label.localeCompare(b.label));
  }
  /** Credited sources that inform no model term (context, measurement plans, mathematics, philosophy). */
  const ATTR_N = 101, PUSH27 = "Time, dynamics, control and imagery";
  const context = () => { const used = new Set(TERMS.flatMap(t => t.src.map(entry))); return ENTRIES.filter(e => e.cat !== PUSH27 && !used.has(e)); };

  /** Browser: fill the Where ideas come from section. */
  function mountSources() {
    const $ = id => document.getElementById(id);
    const list = $("wi-list");
    TERMS.forEach(t => {
      const li = document.createElement("li");
      const b = document.createElement("strong"); b.textContent = t.name; li.appendChild(b);
      li.append(`: ${t.words} `);
      const s = document.createElement("span"); s.className = "wi-src";
      s.textContent = t.src.length ? `Ideas from ${t.src.map(k => label(entry(k))).join(", ")}.` : "A design choice of this app.";
      li.appendChild(s); list.appendChild(li);
    });
    const c = contributions(), ctx = context();
    $("wi-sum").textContent = `${c.length} of the ${ATTR_N} sources in this map inform a part of the model; the other ${ctx.length} give context, ways to test it, or wider reading.`;
    $("wi-eq").textContent = MERGED_PLAIN;
    $("wi-label").textContent = `Share = terms a source informs ÷ ${TERMS.length}. A ${SHARE_LABEL}.`;
    const ol = $("wi-shares");
    c.forEach(x => { const li = document.createElement("li"); li.textContent = `${x.label}: ${x.terms.map(id => "τ" + id.slice(1)).join(", ")} (${x.terms.length}/${TERMS.length} = ${x.share.toFixed(2)})`; ol.appendChild(li); });
    const btn = $("wi-math"), box = $("wi-math-box");
    btn.addEventListener("click", () => { const open = box.classList.toggle("hidden") === false; btn.setAttribute("aria-expanded", String(open)); btn.textContent = open ? "Hide the math" : "Show the math"; });
  }

  /** Browser: the Credits view in the sheet (opened from the companion's home). */
  function mount(app) {
    const $ = id => document.getElementById(id);
    const box = $("cr-list");
    $("cr-thanks").textContent = GRATITUDE;
    $("cr-media").textContent = MEDIA;
    const c = counts();
    $("cr-count").textContent = `${c.verified} sources checked against Crossref, Open Library, publishers or their own archives; ${c.flagged} flagged where no full citation could be confirmed.`;
    CATEGORIES.forEach(cat => {
      const h = document.createElement("h4"); h.className = "cr-cat"; h.textContent = cat; box.appendChild(h);
      const ul = document.createElement("ul"); ul.className = "cr-items";
      ENTRIES.filter(e => e.cat === cat).forEach(e => {
        const li = document.createElement("li"); li.textContent = e.cite;
        if (e.doi) { li.append(" "); const a = document.createElement("a"); a.href = `https://doi.org/${e.doi}`; a.rel = "noopener"; a.target = "_blank"; a.textContent = `doi:${e.doi}`; li.appendChild(a); }
        if (e.status === "flagged") { const f = document.createElement("span"); f.className = "cr-flag"; f.textContent = ` Flagged: ${e.how}`; li.appendChild(f); }
        ul.appendChild(li);
      });
      box.appendChild(ul);
    });
    mountSources();
    $("pet-credits").addEventListener("click", () => app.open("credits"));
    return () => {};
  }

  MF.Credits = { GRATITUDE, MEDIA, CATEGORIES, ENTRIES, counts, line, TERMS, SHARE_LABEL, MERGED_TEX, MERGED_PLAIN, entry, label, contributions, context, mount };
})(typeof window !== "undefined" ? (window.MF = window.MF || {}) : (global.MF = global.MF || {}));
if (typeof module !== "undefined") module.exports = global.MF.Credits;
