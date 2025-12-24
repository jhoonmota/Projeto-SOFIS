
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://lxnykmfgthlltgfjvekv.supabase.co'
const supabaseKey = 'sb_publishable_suDMO4naUy4iTfoJvJf9-w_m-8hW3d3'

export const supabase = createClient(supabaseUrl, supabaseKey)
