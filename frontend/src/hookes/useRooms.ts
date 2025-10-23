// frontend/src/hooks/useRooms.ts
import useSWR from 'swr';
import { api } from '@/services/api';

export type Room = {
    id: string;
    name: string;
    block: string;
    capacity: number;
    features?: string | null;
};

export function useRooms() {
    const { data, error, isLoading, mutate } = useSWR<Room[]>(
        '/api/rooms',
        (url) => api.get(url).then(r => r.data),
        { revalidateOnFocus: false }
    );

    return {
        rooms: data ?? [],
        isLoading,
        isError: !!error,
        reload: mutate,
    };
}
