#!/bin/bash
# Reemplazar @/lib/supabase por ./supabase en todos los archivos
find src/pages/teacher -name "*.tsx" -exec sed -i "s|from '@/lib/supabase'|from '@/lib/supabase'|g" {} \;
find src/pages/student -name "*.tsx" -exec sed -i "s|from '@/lib/supabase'|from '@/lib/supabase'|g" {} \;
find src/components -name "*.tsx" -exec sed -i "s|from '@/lib/supabase'|from '@/lib/supabase'|g" {} \;
find src/pages -name "*.tsx" -maxdepth 1 -exec sed -i "s|from '@/lib/supabase'|from '@/lib/supabase'|g" {} \;
