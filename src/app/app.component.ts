import { Component, ViewEncapsulation } from '@angular/core';
import Tone from 'tone';
import SeedRandom from 'seedrandom';

// Import instruments
import Snare from './snare';


/* A list of 'scales' by midi notes 
 *
 * Each one represents one entire scale through
 */
const scaleMidi = {
    'major': [0, 2, 4, 5, 7, 9, 11],
    'minor': [0, 2, 3, 5, 7, 8, 10],
};

/*
 *
 *
 */
const chordProgs = {
    "I-V-vi-IV": [
        scaleMidi.major.map(i => i + 0),
        scaleMidi.major.map(i => i + 7),
        scaleMidi.major.map(i => i + 5),
        scaleMidi.major.map(i => i + 9),
    ]
};


// calculate the 'hz' from a given midi note
// For reference: middle C is 60
function fromMIDI(midiNote) {
    return Math.pow(2, (midiNote - 69) / 12) * 440;
}

// return a random (pass in a 'SeedRandom' to use for the generator)
function getRandom(list, rngFunc) {
  return list[Math.floor(rngFunc() * list.length)];
}

/* Vibe - a 'Vibe' is basically a datastructure describing a song/generation routine
 *
 * All Vibes have the following instrumentations:
 * * Sub
 * * Bass
 * * Kick
 * * Snare
 * * OpenHat
 * * ClosedHat
 * * ChordSupport
 * * MainVoice
 * 
 */
class Vibe {

    // random generations
    RNG;

    // what generated the Vibe
    seed;

    // instruments
    inst;

    // the loop that always plays
    loop;


    constructor(seed) {
        var self = this;
        // create a random seed
        self.seed = seed;
        self.RNG = SeedRandom(seed);

        self.inst = {

            'Kick': new Tone.MembraneSynth().toMaster(),

            'Snare': new Tone.NoiseSynth({
                "volume" : -5,
                "envelope" : {
                    "attack" : 0.001,
                    "decay" : 0.2,
                    "sustain" : 0
                },
                "filterEnvelope" : {
                    "attack" : 0.001,
                    "decay" : 0.1,
                    "sustain" : 0
                }
            }).toMaster(),

            'OpenHat': new Tone.NoiseSynth({
                "volume" : -15,
                "envelope" : {
                    "attack" : 0.06,
                    "decay" : 0.05,
                    "sustain" : 0.02
                },
                "filterEnvelope" : {
                    "attack" : 0.25,
                    "decay" : 0.25,
                    "sustain" : 0
                }
            }).toMaster(),


            'MainVoice':  new Tone.Synth().toMaster(),

            'ChordSupport': new Tone.PolySynth(8, Tone.AMSynth, {
                oscillator : {
                    type : "square"
                }
            }).toMaster(),
        };

        var midiBase = 60;

        var barsPerLoop = 4;
        console.log("starting loop!")

        self.loop = new Tone.Loop(function(time) {

            const chords = chordProgs["I-V-vi-IV"];
            console.log("LOOP");

            for (var bar = 0; bar < barsPerLoop; ++bar) {
                
                // start time for the bar
                var stime = time + Tone.Time("1:0:0") * bar;
                var chord = chords[bar];

                // loop through chord
                /*([0, 2, 4]).forEach(i => {
                    self.inst.ChordSupport.triggerAttackRelease(fromMIDI(midiBase + chord[i]), "4n", stime);
                });*/

                for (var beat = 0; beat < 4; ++beat) {
                    self.inst.Kick.triggerAttackRelease('C1', "8n", stime + Tone.Time("4n") * beat);
                }
                for (var beat = 1; beat < 4; beat += 2) {
                    self.inst.Snare.triggerAttackRelease("8n", stime + Tone.Time("4n") * beat);
                }

                for (var beat = 0; beat < 4; ++beat) {
                    self.inst.OpenHat.triggerAttackRelease("8n", stime + Tone.Time("8n") * (2 * beat + 1));
                }

                for (var beat = 0; beat < 8; ++beat) {
                    var curNote = midiBase + chord[getRandom([0, 2, 4, 5, 6], self.RNG)] - 12;
                    self.inst.MainVoice.triggerAttackRelease(fromMIDI(curNote), "4n", stime + Tone.Time("8n") * beat);
                }
            }


        }, `${barsPerLoop}:0:0`);
    }

    // start the playback
    start() {
        this.loop.start(0);
    }

    // stop the playback
    stop() {
        this.loop.stop(0);
    }

}


// Calculate a 'vibe' state 
function getVibeFromString(str) {
    return new Vibe(str);
}



@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class AppComponent {

    // the title of the component
    title = 'VibeGen';

    vibe: Vibe;

    // called when it's created
    constructor() {




        // construct a generator
        this.vibe = new Vibe('apple');

        // start the vibe
        this.vibe.start();

        // begin the transport (for ToneJS)
        Tone.Transport.start();

    }
}
