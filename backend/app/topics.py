"""
Topic profiles: everything the AI prompts say that is specific to one subject.

The active topic comes from the TOPIC env var ("permits" or "parks"). Categories,
item types and departments are not here: they live in the versioned system
config in PostgreSQL, so each topic has its own config version.
"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict

CONTEXT_ROOT = Path(__file__).parent / "context"


@dataclass(frozen=True)
class Topic:
    key: str
    subject: str                 # what residents are giving feedback about
    item_label: str              # what the config's "permit_types" list means for this topic
    item_question: str           # classifier instruction for picking an item type
    chatbot_role: str            # opening line of the chatbot's system message
    required_info: str           # what a complete piece of feedback contains
    item_hints: str              # how to map everyday words to item types
    sufficient_examples: str
    quality_scoring: str
    valid_topics: str            # spam filter: what counts as on-topic
    invalid_examples: str
    context_categories: Dict[str, str] = field(default_factory=dict)

    @property
    def context_dir(self) -> Path:
        return CONTEXT_ROOT / self.key


PERMITS = Topic(
    key="permits",
    subject="Boston city permits and licenses",
    item_label="Permit Type",
    item_question="Which Boston permit this relates to",
    chatbot_role="You are an intelligent feedback quality assistant for Boston city government permit processes.",
    required_info="""1. Permit Type - Which Boston permit applies
2. Problem Type - Cost, time, process, or policy issue
3. Concrete Details - Specific numbers, timeframes, or examples""",
    item_hints="""- "renovation/construction" → Building permit
- "bar/restaurant/café" → Liquor License or Common Victualler
- "event/concert" → Entertainment License
- "parking" → Resident/Business Parking
- "digging/roadwork" → Excavation
- "sign/storefront" → Sign Permit
- "electrical/plumbing/gas" → Respective permits
- Unclear → Ask what activity/work they're describing""",
    sufficient_examples="""✓ "Building permit took 6 weeks, expected 2-3"
✓ "Liquor license fee was $500, seemed high"
✓ "Application form didn't explain when inspection was needed\"""",
    quality_scoring="""- 1-2: Single words ("bad", "slow") or completely unintelligible
- 3-4: Vague complaints without specifics ("it was expensive", "took too long", "confusing process")
- 5: Has problem category but missing key details ("application fee was high" - how high? which permit?) OR has permit + vague problem
- 6-7: Has permit + problem type + ANY specific detail (timeframe OR cost OR process step)
       Examples: "Building permit took 8 weeks" or "Liquor license fee was $800" or "Application process was confusing"
- 8-9: Has permit + problem type + MULTIPLE specific details that can be analyzed
       Examples: "Building permit took 8 weeks, expected 3-4, mostly waiting for inspection"
- 10: Comprehensive, actionable data with permit, problem, specifics, and context
      Example: "Building permit for kitchen renovation cost $500 fee plus $300 for required fire inspection, took 6 weeks total with 4 weeks just waiting for inspection appointment\"""",
    valid_topics="""- Building permits, construction, renovations
- Business licenses (liquor, food service, entertainment)
- Parking permits (resident, business)
- Fire department permits (hot work, fire alarms)
- Public works permits (excavation, dumpsters, street occupancy)
- Sign permits, electrical, plumbing, gas permits
- Any Boston city government permit or licensing process""",
    invalid_examples="""- Random text: "asdfghjkl" or "test test test"
- Completely unrelated: "I love pizza", "Weather is nice today"
- Promotional/spam: "Buy now!", "Click here for deals"
- Trolling: "This system is stupid and you're all idiots" (without any permit context)
- Personal rants unrelated to permits: "My neighbor is annoying\"""",
    context_categories={
        "general_info": "contacts/portals",
        "home_renovations": "kitchen/bathroom/residential",
        "events_entertainment": "parties/venues/clubs",
        "restaurants_bars": "food businesses/liquor",
        "construction_contractors": "hot work/dumpsters/contractors",
    },
)

PARKS = Topic(
    key="parks",
    subject="Boston parks, playgrounds and outdoor recreation spaces",
    item_label="Park Feature",
    item_question="Which park feature or facility this relates to",
    chatbot_role="You are an intelligent feedback quality assistant for the City of Boston, collecting resident feedback about local parks and playgrounds.",
    required_info="""1. Park Feature - Which part of the park (playground, field, court, restrooms, paths, etc.)
2. Location - Which park or neighborhood
3. Problem or Idea - What's wrong, or what would make it better
4. Concrete Details - When it happens, how long it's been an issue, who is affected""",
    item_hints="""- "swings/slide/climbing structure/play area" → Playground
- "sprinklers/spray/water play" → Splash Pad / Spray Deck
- "soccer/baseball/softball/field" → Sports Field
- "hoops/basketball/tennis/pickleball" → Basketball / Tennis Court
- "dogs/off-leash" → Dog Park
- "path/trail/walkway" → Walking Path / Trail
- "bathroom/restroom" → Restrooms
- "dark/lights/at night" → Lighting
- "trees/grass/flowers/mowing" → Trees & Landscaping
- Unclear → Ask which part of the park they mean""",
    sufficient_examples="""✓ "The swings at the playground near Adams St in Dorchester have been broken for 3 weeks"
✓ "There's no shade at the Ronan Park playground, kids can't use it on summer afternoons"
✓ "The restrooms at the field are locked every weekend during Little League games\"""",
    quality_scoring="""- 1-2: Single words ("bad", "dirty") or completely unintelligible
- 3-4: Vague complaints or wishes without specifics ("the park needs work", "make it nicer")
- 5: Has a park feature OR a location but missing the specific problem or idea
- 6-7: Has park feature + location (park name or neighborhood) + ANY specific detail
       Examples: "Swings at the Dorchester playground broken for 3 weeks" or "No lights on the East Boston walking path"
- 8-9: Has park feature + location + MULTIPLE specific details
       Examples: "The basketball court lights at the Roxbury park go off at 8pm, so teens can't play after work or school in the fall"
- 10: Comprehensive, actionable detail with feature, location, impact and a suggestion
      Example: "The splash pad at the Jamaica Plain playground has been off since July; it's the only water play nearby, families now drive 20 minutes, and a posted repair date would help\"""",
    valid_topics="""- Playgrounds, play equipment and splash pads
- Sports fields, courts, pools and beaches
- Paths, trails, benches, shade, lighting and restrooms
- Trees, grass, gardens, litter and maintenance
- Safety, accessibility and who can use the park
- Park programs, events, reservations and communication from the city
- Ideas for new or improved parks and playgrounds in Boston""",
    invalid_examples="""- Random text: "asdfghjkl" or "test test test"
- Completely unrelated: "I love pizza", "My internet is slow"
- Promotional/spam: "Buy now!", "Click here for deals"
- Trolling: "You're all idiots" (without any park context)
- Personal disputes unrelated to parks: "My neighbor is annoying\"""",
    context_categories={
        "general_info": "who runs parks, how to report issues, contacts",
        "playgrounds": "play equipment, splash pads, safety surfacing, ages",
        "sports_fields_courts": "fields, courts, pools, reservations",
        "maintenance_safety": "litter, repairs, lighting, trees, safety",
        "programs_events": "events, programs, park permits, community groups",
    },
)

TOPICS = {topic.key: topic for topic in (PERMITS, PARKS)}


def get_topic(key: str) -> Topic:
    if key not in TOPICS:
        raise RuntimeError(f"Unknown TOPIC '{key}'. Expected one of: {', '.join(TOPICS)}")
    return TOPICS[key]
