import { MachineConfig, send, Action, assign } from "xstate";

function say(text: string): Action<SDSContext, SDSEvent> {
  return send((_context: SDSContext) => ({ type: "SPEAK", value: text }));
}

interface Grammar {
  [index: string]: {
    intent: string;
    entities: {
      [index: string]: string;
    };
  };
}

const grammar: Grammar = {
  "create a meeting": {
    intent: "create_meeting",
    entities: {}
  },
  lecture: {
    intent: "None",
    entities: { title: "Dialogue systems lecture" },
  },
  lunch: {
    intent: "None",
    entities: { title: "Lunch at the canteen" },
  },
  "on friday": {
    intent: "None",
    entities: { day: "Friday" },
  },
  "at ten": {
    intent: "None",
    entities: { time: "10:00" },
  },
  "who is alex?": {
    intent: "who_is_x",
    entities: { person_name: "Alex" }
  }
};

const getEntity = (context: SDSContext, category: string) => {
/*
  // lowercase the utterance and remove tailing "."
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  if (u in grammar) {
    if (category in grammar[u].entities) {
      return grammar[u].entities[category];
    }
  }
  return false;
  */
  console.log("getEntity category=" + category);
  console.log("nluResult:");
  console.log(context.nluResult);
  var result = false;
  context.nluResult.prediction.entities.forEach(entity => {
    if(entity.category == category) {
      console.log(entity.text);
      result = entity.text;
    }
  });
  console.log("returning " + result);
  return result;
};

const getIntent = (context: SDSContext) => {
/*
  // lowercase the utterance and remove tailing "."
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  if (u in grammar) {
    return grammar[u].intent;
  }
  */
  console.log("nluResult:");
  console.log(context.nluResult);
  return context.nluResult.prediction.topIntent;
};

export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = {
  initial: "idle",
  states: {
    idle: {
      on: {
        CLICK: "init",
      },
    },
    init: {
      on: {
        TTS_READY: "welcome",
        CLICK: "welcome",
      },
    },
    welcome: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "create_meeting",
            cond: (context) => (getIntent(context) == "create_meeting")
          },
          {
            target: "who_is_x",
            cond: (context) => (getIntent(context) == "who_is_x"),
            actions: assign({
              name: (context) => getEntity(context, "person_name"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("How can I help you?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    create_meeting: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info",
            cond: (context) => !!getEntity(context, "title"),
            actions: assign({
              title: (context) => getEntity(context, "title"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("Let's create a meeting. What is it about?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    who_is_x: {
      initial: "answer",
      states: {
        answer: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `I don't know who ${context.name} is.`,
          })),
        },
      },
    },
    info: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.title}`,
      })),
      on: { ENDSPEECH: "init" },
    },
  },
};

const kbRequest = (text: string) =>
  fetch(
    new Request(
      `https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`
    )
  ).then((data) => data.json());
