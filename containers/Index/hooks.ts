import { getStore } from "../../database/firestore";
import { useRouter } from 'next/router'
import { getMeetingPlayerRepository } from "../../repository/meetingPlayer";

export type LandingState = {
    createRoom: (name:string) => void
}

export const useLanding = () : LandingState => {
    const router = useRouter();
    return {
        async createRoom(name) {
            const store = getStore();
            const roomDoc = store.collection("rooms").doc();
            const {id} = roomDoc;
            const dao = getMeetingPlayerRepository(id);
            await Promise.all([
                roomDoc.set({
                    phase:"Meeting"
                }),
                dao.registerMeetingPlayer({
                    name,
                    host:true
                })
            ])
            router.push(`/meeting?room=${id}`);
        }
    }
    
}