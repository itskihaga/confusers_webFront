import * as t from "io-ts";
import { MeetingPlayer, PLAYERS_NUM } from "../model/player";
import firebase from "firebase";
import { getStore } from "./firestore";
import { log } from "../logger";

const PlayerIO = t.type({
    name:t.string,
    registeredAt: t.number
});

type Player = t.TypeOf<typeof PlayerIO>;

type RegisterResult = {
    success: true,
    id: string
} | {
    success: false,
    cause: "UNEXPECTED_ERROR" | "OVER_CAPACITY"
}

export const registerMeetingPlayer = async (roomId:string,player:Player): Promise<RegisterResult> => {
    const store = getStore();
    const roomDoc = store.collection("rooms").doc(roomId);
    const playersCol = roomDoc.collection("players");
    return store.runTransaction<RegisterResult>(async t => {
        if((await playersCol.get()).size < PLAYERS_NUM){
            const newPlayer = playersCol.doc();
            t.set(newPlayer,player);
            return {
                success:true,
                id: newPlayer.id
            }
        }
        return {
            success:false,
            cause: "OVER_CAPACITY"
        }
    }).catch(() => ({success:false,cause:"UNEXPECTED_ERROR"}))
    
}

export const syncMeetingPlayers = (
    roomId:string,
    yourId: string | null,
    listener:(players: MeetingPlayer[]) => void,
    onError: () => void
) : () => void => {
    const store = getStore();
    const roomDoc = store.collection("rooms").doc(roomId);
    const playersCol = roomDoc.collection("players").orderBy("registeredAt")
    const onFetched = ((fetched : firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>)=> {
        try {
            const players = fetched.docs.map<MeetingPlayer>(e => {
                const io = e.data();
                const decoded = PlayerIO.decode(io);
                if(decoded._tag === "Left"){
                    throw decoded.left;
                }
                const data  = decoded.right;
                return {
                    id:e.id,
                    displayName: data.name,
                    registeredAt: data.registeredAt,
                    you: yourId === e.id,
                }
            })
            listener(players);
        } catch (error) {
            log(error);
            onError();
        }
    })
    playersCol.get().then(onFetched).catch(onError);
    return playersCol.onSnapshot(onFetched,onError);

};