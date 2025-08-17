import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  return_window_days: number;
  created_at: string;
}

export async function listCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, patch: { 
  return_window_days: number;
  name?: string;
}) {
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function createCategory(category: {
  name: string;
  return_window_days: number;
}) {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}