UPDATE public.creator_profiles
SET display_name = 'ATO Gastro',
    handle = 'ato.gastro',
    headline = NULL,
    bio = NULL,
    location = NULL,
    categories = '{}'::text[],
    avatar_url = NULL
WHERE instagram_username = 'ato.gastro';