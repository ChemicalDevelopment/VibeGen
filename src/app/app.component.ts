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
}

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


            'MainVoice': new Tone.PluckSynth().toMaster(),

            'ChordSupport': new Tone.PolySynth(6, Tone.Synth, {
                oscillator : {
                      type : "square"
                  }
              }).toMaster(),

        };

        var midiBase = 60;

        var barsPerLoop = 2;

        self.loop = new Tone.Loop(function(time) {

            const chords = [
                [0, 4, 7],
                [0-3, 3-3, 7-3],
            ];

            chords.forEach((chord, i) => {
                chord.forEach((note, j) => {
                    self.inst.ChordSupport.triggerAttackRelease(fromMIDI(midiBase + note), "4n", time + Tone.Time("1:0:0") * i);

                });
            });

            for (var i = 0; i < 8 * barsPerLoop; ++i) {
                var curNote = midiBase + getRandom(scaleMidi.major, self.RNG);
                self.inst.MainVoice.triggerAttackRelease(fromMIDI(curNote), "8n", time + Tone.Time("8n") * i);
            }

            for (var i = 0; i < 4 * barsPerLoop; ++i) {
                self.inst.Kick.triggerAttackRelease('C1', "8n", time + Tone.Time("4n") * i);
            }

            for (var i = 1; i < 4 * barsPerLoop; i += 2) {
                self.inst.Snare.triggerAttackRelease("8n", time + Tone.Time("4n") * i);
            }

            for (var i = 1; i < 8 * barsPerLoop; i += 2) {
                self.inst.OpenHat.triggerAttackRelease("16n", time + Tone.Time("8n") * i);
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

        // begin the transport (for ToneJS)
        Tone.Transport.start();


        // construct a generator
        this.vibe = new Vibe('apple');

        // start the vibe
        this.vibe.start();

    }
}
