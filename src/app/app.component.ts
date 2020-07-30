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
    'major':  [0, 2, 4, 5, 7, 9, 11],
    'minor':  [0, 2, 3, 5, 7, 8, 10],
};



/* A list of 'chords' as MIDI
 *
 *
 */
const chordMidi = {
    'major':   [0, 4, 7],
    'minor':   [0, 3, 7],
    'major7':  [0, 4, 7, 11],
    'minor7':  [0, 3, 7, 10],
    '7':       [0, 4, 7, 10],
    'aug':     [0, 4, 8],
    'dim':     [0, 3, 6],
    'dim7':    [0, 3, 6, 9],
    'hdim7':   [0, 3, 6, 10],
};

// apply an offset to the array
function withOffset(offset, arr) {
    return arr.map(i => i + offset);
}

// calculate the 'hz' from a given midi note
// For reference: middle C is 60
// Allows fractional notes as well
function fromMIDI(midiNote) {
    return Math.pow(2, (midiNote - 69) / 12) * 440;
}

// return a random (pass in a 'SeedRandom' to use for the generator)
function getRandom(list, rngFunc) {
  return list[Math.floor(rngFunc() * list.length)];
}

// rotate array by N, add add `vshift` to the shifted elements
// Adds `vshift` multiple times if `n` caused the shift to wrap around the array
function rot(arr, n=0, vshift=0) {
    var new_arr = arr.map((elem, i) => arr[((i + n) % arr.length + arr.length) % arr.length]);
    if (n > 0) {
        for (var i = 0; i < n; ++i) new_arr[arr.length - i - 1] += vshift;
    } else {
        for (var i = 0; i < -n; ++i) new_arr[i] += vshift;
    }
    // if things were shifted more than an entire length, 
    //   add multiple 'vshift' values to them
    for (var i = 0; i < new_arr.length; ++i) {
        new_arr[i] += vshift * Math.floor(Math.abs(n) / new_arr.length);
    }

    return new_arr;
}



/* List of common chord progressions
 *
 * TODO: add a programmatic parser to parse them and generate them
 *
 */
const chordProgs = {
    //"dsad": [[0, 'dim7'], [7, 'dim7'], [0, 'dim7'], [7, 'dim7']],
    //"iii-iv-iii-I#": [[5, 'minor'], [6, 'minor'], [5, 'minor'], [1, 'major']],
    "Imajor7-VIImajor-III7-VImajor7": [[0, 'major7'], [-1, 'major'], [4, '7'], [-3, 'major7']],
    //"Imajor7-II7-iiminor7-V7": [[0, 'major7'], [2, '7'], [2, 'minor7'], [7, '7']],
};


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

    // what iteration are we on?
    iterN;


    constructor(seed) {
        var self = this;
        // create a random seed
        self.seed = seed;
        self.RNG = SeedRandom(seed);

        // start off on iteration 0
        self.iterN = 0

        // dictionary of instuments
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

        // number of bars to generate per loop
        var barsPerLoop = 4;
        
        // base MIDI noet
        var midiBase = 60;

        // what chord should we use?
        // TODO: change this over time
        //const prog = "Imajor7-II7-iiminor7-V7";
        const prog = getRandom(Object.keys(chordProgs), self.RNG);

        console.log(prog)

        // looping function to generate 
        self.loop = new Tone.Loop(function(time) {
            console.log("LOOP: #" + self.iterN);


            //
            const chords = chordProgs[prog];

            for (var bar = 0; bar < barsPerLoop; ++bar) {
                // the start time for this bar                
                var stime = time + Tone.Time("1:0:0") * bar;

                // get the current chord for this bar
                var chord = chords[bar % chords.length];

                /* DRUMS */

                // Basic break-beat style pattern
                // TODO: drum permutations and non-4/4 generation
                for (var beat = 0; beat < 4; ++beat) {
                    self.inst.Kick.triggerAttackRelease('C1', "8n", stime + Tone.Time("4n") * beat);
                }
                for (var beat = 1; beat < 4; beat += 2) {
                    self.inst.Snare.triggerAttackRelease("8n", stime + Tone.Time("4n") * beat);
                }
                for (var beat = 0; beat < 4; ++beat) {
                    self.inst.OpenHat.triggerAttackRelease("8n", stime + Tone.Time("8n") * (2 * beat + 1));
                }

                /* MELODIES/BASSLINES */

                // offset that the noets are applied with
                var offset = midiBase + +chord[0];

                // Generate the notes of the given scale
                var notes = chordMidi[chord[1]];

                //chord
                self.inst.ChordSupport.triggerAttackRelease(fromMIDI(offset + notes[0] - 24), "4n", stime);



                // inversion cycles;
                // value is by how many notes the array is shifted
                const cycl = [
                    0,
                    -1,
                    0,
                    -2,

                    0,
                    -1,
                    1,
                    2,
                ];

                // get current cycle
                var this_cycl = cycl[self.iterN % cycl.length];

                // get rotated notes, essentially an inversion of the existing ones in the
                //   chord
                var rot_notes = rot(notes, this_cycl, Math.sign(this_cycl) * 12);

                // keep track of the last note played
                var lastNote = -1;

                for (var beat = 0; beat < 8; ++beat) {

                    // generate random new note
                    var curNote = offset + getRandom(rot_notes, self.RNG);
                    if (curNote != lastNote) {
                        // play note if it differs
                        self.inst.MainVoice.triggerAttackRelease(fromMIDI(curNote), "4n", stime + Tone.Time("8n") * beat / 2);
                        lastNote = curNote;
                    } else {
                        // otherwise set to -1, so that only a maximum of 1 note is skipped
                        // i.e. if we didn't do this, then if we generated `AAA` it would just play `A`
                        //   while we want it to play `A A`
                        lastNote = -1;
                    }
                }



            }

            // incremement iteration
            self.iterN++;

        }, `${barsPerLoop}:0:0`);
    }

    // start the playback
    start() {
        console.log("LOOP: start");
        this.loop.start(0);
    }

    // stop the playback
    stop() {
        console.log("LOOP: stop");
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
        this.vibe = new Vibe('gregsucks');

        // begin the transport (for ToneJS)
        Tone.Transport.start();

        Tone.Transport.bpm.value = 72;

        // start the vibe
        this.vibe.start();

    }
}
