class GameSession{
    constructor(map, kills, headshots, damage_dealt, mode, team, max_dist, killer, knockouts, knockedouts){
        this.map = map;
        this.kills = kills;
        this.headshots = headshots;
        this.damage_dealt = damage_dealt;
        this.mode = mode;
        this.team = team;
        this.max_dist = max_dist;
        this.killer = killer;
        this.knockouts = knockouts;
        this.knockedouts = knockedouts;
    }

    get map(){
        return this.map;
    }
}