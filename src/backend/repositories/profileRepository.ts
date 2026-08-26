import type { BackendProfile } from '../domain';
import { toBackendError } from '../errors';
import { requireSupabase } from '../supabaseClient';

const mapProfile = (row: {
  id: string;
  display_name: string;
  avatar_url: string | null;
}): BackendProfile => ({
  id: row.id,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
});

export const profileRepository = {
  async getCurrent(): Promise<BackendProfile | null> {
    const client = requireSupabase();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) throw toBackendError(userError);
    if (!userData.user) return null;
    const { data, error } = await client
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (error) throw toBackendError(error);
    return data ? mapProfile(data) : null;
  },

  async updateCurrent(input: { displayName?: string; avatarUrl?: string | null }) {
    const client = requireSupabase();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw toBackendError(userError ?? new Error('Not authorized'));
    const { data, error } = await client
      .from('profiles')
      .update({
        ...(input.displayName !== undefined ? { display_name: input.displayName.trim() } : {}),
        ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
      })
      .eq('id', userData.user.id)
      .select('id, display_name, avatar_url')
      .single();
    if (error) throw toBackendError(error);
    return mapProfile(data);
  },
};
