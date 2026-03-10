-- Migration: 13_seed_5etools_backgrounds
-- Description: Seeds the structured backgrounds table using 5eTools data for the Character Builder.

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Aberrant Heir', 'A background from EFA', '["History","Intimidation"]'::jsonb, '["Disguise kit"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Acolyte', 'A background from PHB', '["Insight","Religion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Shelter of the Faithful', 'As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity. You and your adventuring companions can expect to receive free healing and care at a temple, shrine, or other established presence of your faith, though you must provide any material components needed for spells. Those who share your religion will support you (but only you) at a modest lifestyle.
You might also have ties to a specific temple dedicated to your chosen deity or pantheon, and you have a residence there. This could be the temple where you used to serve, if you remain on good terms with it, or a temple where you have found a new home. While near your temple, you can call upon the priests for assistance, provided the assistance you ask for is not hazardous and you remain in good standing with your temple.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Acolyte', 'A background from XPHB', '["Insight","Religion"]'::jsonb, '["Calligrapher''s supplies"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Anthropologist', 'A background from ToA', '["Insight","Religion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Adept Linguist', 'You can communicate with humanoids who don''t speak any language you know. You must observe the humanoids interacting with one another for at least 1 day, after which you learn a handful of important words, expressions, and gestures - enough to communicate on a rudimentary level.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Archaeologist', 'A background from EFA', '["History","Survival"]'::jsonb, '["Cartographer''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Archaeologist', 'A background from ToA', '["History","Survival"]'::jsonb, '["Choose tool"]'::jsonb, '[]'::jsonb, 'Historical Knowledge', 'When you enter a ruin or dungeon, you can correctly ascertain its original purpose and determine its builders, whether those were dwarves, elves, humans, yuan-ti, or some other known race. In addition, you can determine the monetary value of art objects more than a century old.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Artisan', 'A background from XPHB', '["Investigation","Persuasion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Astral Drifter', 'A background from AAG', '["Insight","Religion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Divine Contact', 'You gain the Magic Initiate from the Player''s Handbook and must choose cleric for the feat.
In the Astral Sea, you crossed paths with a wandering deity. The encounter was brief and nonviolent, yet it made a lasting impression on you. This deity saw fit to share one secret or obscure bit of cosmic lore with you. Work with your DM to determine the details of this knowledge and its impact on the campaign.
Roll on the Divine Contact table to determine which deity you encountered, or work with your DM to identify a more suitable choice.
[object Object]')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Athlete', 'A background from MOT', '["Acrobatics","Athletics"]'::jsonb, '["Vehicles (land)"]'::jsonb, '[]'::jsonb, 'Echoes of Victory', 'You have attracted admiration among spectators, fellow athletes, and trainers in the region that hosted your past athletic victories. When visiting any settlement within 100 miles of where you grew up, there is a 50 chance you can find someone there who admires you and is willing to provide information or temporary shelter.
Between adventures, you might compete in athletic events sufficient enough to maintain a comfortable lifestyle, as per the "Practicing a Profession" downtime activity in chapter 8 of the Player''s Handbook.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Azorius Functionary', 'A background from GGR', '["Insight","Intimidation"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Legal Authority', 'You have the authority to enforce the laws of Ravnica, and that status inspires a certain amount of respect and even fear in the populace. People mind their manners in your presence and avoid drawing your attention; they assume you have the right to be wherever you are. Showing your Azorius insignia gets you an audience with anyone you want to talk to (though it might cause more problems than it solves when you''re dealing with incorrigible lawbreakers). If you abuse this privilege, though, you can get in serious trouble with your superiors and even be stripped of your position.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Black Fist Double Agent', 'A background from ALCurseOfStrahd', '["Deception","Insight"]'::jsonb, '["Disguise kit","Choose tool"]'::jsonb, '[]'::jsonb, 'Double Agent', 'You have a reliable and trusty contact within the Tears of Virulence garrison in Phlan to whom you pass information and secrets. In exchange, you can get away with minor criminal offenses within the town of Phlan. In addition, your Black Fists contacts can help you secure an audience with the Lord Regent, the Lord Sage, members of the Black Fists, or deposed nobles and authority figures who are sympathetic to the Phlan refugees and insurgents. Note: This feature is a variant of the Noble feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Boros Legionnaire', 'A background from GGR', '["Athletics","Intimidation"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Legion Station', 'You have an established place in the hierarchy of the Boros Legion. You can requisition simple equipment for temporary use, and you can gain access to any Boros garrison in Ravnica, where you can rest in safety and receive the attention of medics. You are also paid a salary of 1 gp (a Boros-minted 1-zino coin) per week, which (combined with free lodging in your garrison) enables you to maintain a poor lifestyle between adventures.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Caravan Specialist', 'A background from ALElementalEvil', '["Animal handling","Survival"]'::jsonb, '["Vehicles (land)"]'::jsonb, '[]'::jsonb, 'Wagonmaster', 'You are used to being in charge of the operation and your reputation for reliability has you on a short list when the job is critical. Experience has taught you to rely on your gut. Others recognize this and look to you for direction when a situation gets serious. You are able to identify the most defensible locations for camping. If you are part of a caravan outfit, you are able to attract two additional workers that are loyal to you based on your reputation. You have an excellent memory for maps and geography and can always determine your cardinal directions while traveling. Note: This feature is a variant of the Outlander feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Carouser', 'A background from ABH', '["Deception","Persuasion"]'::jsonb, '["Gaming set"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Celebrity Adventurer''s Scion', 'A background from AI', '["Perception","Performance"]'::jsonb, '["Disguise kit"]'::jsonb, '[]'::jsonb, 'Name Dropping', 'You know and have met any number of powerful people across the land—and some of them might even remember you. You might be able to wrangle minor assistance from a major figure in the campaign, at the DM''s discretion. Additionally, the common folk treat you with deference, and your heritage and the stories you tell might be good for a free meal or a place to sleep.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Charlatan', 'A background from PHB', '["Deception","Sleight of hand"]'::jsonb, '["Disguise kit","Forgery kit"]'::jsonb, '[]'::jsonb, 'False Identity', 'You have created a second identity that includes documentation, established acquaintances, and disguises that allow you to assume that persona. Additionally, you can forge documents including official papers and personal letters, as long as you have seen an example of the kind of document or the handwriting you are trying to copy.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Charlatan', 'A background from XPHB', '["Deception","Sleight of hand"]'::jsonb, '["Forgery kit"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Chondathan Freebooter', 'A background from FRHoF', '["Athletics","Sleight of hand"]'::jsonb, '["Weaver''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('City Watch', 'A background from SCAG', '["Athletics","Insight"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Watcher''s Eye', 'Your experience in enforcing the law, and dealing with lawbreakers, gives you a feel for local laws and criminals. You can easily find the local outpost of the watch or a similar organization, and just as easily pick out the dens of criminal activity in a community, although you''re more likely to be welcome in the former locations rather than the latter.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Clan Crafter', 'A background from SCAG', '["History","Insight"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Respect of the Stout Folk', 'As well respected as clan crafters are among outsiders, no one esteems them quite so highly as dwarves do. You always have free room and board in any place where shield dwarves or gold dwarves dwell, and the individuals in such a settlement might vie among themselves to determine who can offer you (and possibly your companions) the finest accommodations and assistance.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Cloistered Scholar', 'A background from SCAG', '["History","Choose from list"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Library Access', 'Though others must often endure extensive interviews and significant fees to gain access to even the most common archives in your library, you have free and easy access to the majority of the library, though it might also have repositories of lore that are too valuable, magical, or secret to permit anyone immediate access.
You have a working knowledge of your cloister''s personnel and bureaucracy, and you know how to navigate those connections with some ease.
Additionally, you are likely to gain preferential treatment at other libraries across the Realms, as professional courtesy to a fellow scholar.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Cormanthor Refugee', 'A background from ALRageOfDemons', '["Nature","Survival"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Shelter of the Elven Clergy', 'The clerics of Elventree have vowed to care for the Cormanthor refugees. They will help you when they can, including providing you and your companions with free healing and care at temples, shrines, and other established presences in Elventree. They will also provide you (but only you) with a poor lifestyle. Note: This feature is a variant of the Acolyte feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Courtier', 'A background from SCAG', '["Insight","Persuasion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Court Functionary', 'Your knowledge of how bureaucracies function lets you gain access to the records and inner workings of any noble court or government you encounter. You know who the movers and shakers are, whom to go to for the favors you seek, and what the current intrigues of interest in the group are.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Criminal', 'A background from PHB', '["Deception","Stealth"]'::jsonb, '["Thieves'' tools"]'::jsonb, '[]'::jsonb, 'Criminal Contact', 'You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Criminal', 'A background from XPHB', '["Sleight of hand","Stealth"]'::jsonb, '["Thieves'' tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Custom Background', 'A background from PHB', '["Choose from list"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Choose a Feature', 'Choose a feature from any background.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Dead Magic Dweller', 'A background from FRHoF', '["Medicine","Survival"]'::jsonb, '["Leatherworker''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Dimir Operative', 'A background from GGR', '["Deception","Stealth"]'::jsonb, '["Disguise kit"]'::jsonb, '[]'::jsonb, 'False Identity', 'You have more than one identity. The one you wear most of the time makes you appear to be a member of a guild other than House Dimir. You have documentation, established acquaintances, and disguises that allow you to assume that persona and fit into the secondary guild.
Whenever you choose, you can drop this identity and blend into the guildless masses of the city.
Consider why you''re embedded in the secondary guild. Create a story with your DM, inspired by rolling on the following table or choosing a reason that suits you.
[object Object]')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Dragon Casualty', 'A background from ALCurseOfStrahd', '["Intimidation","Survival"]'::jsonb, '["Vehicles (water)","Choose tool","Vehicles (land)"]'::jsonb, '[]'::jsonb, 'Dragonscarred', 'Over a period of several months you were subject to magical and mundane torture at the claws of Vorgansharax and his minions. These experiments have left you horribly disfigured but mark you as a survivor of the Maimed Virulence. This affords you a measure of fame and notoriety, for those who know of your harrowing ordeal are keen to hear the tale personally but makes it difficult to disguise your appearance and hide from prying eyes.
You can parlay this attention into access to people and places you might not otherwise have, for you and your companions. Nobles, scholars, mages, and those who seek to ferret out the secrets of the Maimed Virulence would all be keen to hear your tale of survival, and learn what secrets (if any) you might possess, and/or study your affliction with great interest. However, you fear that your afflictions are not completely mundane and that the Maimed Virulence may as yet have some nefarious reason for allowing your escape, as your scars burn with acidic fury and seem to writhe beneath your skin at times. Note: This feature is a variant of the Far Traveler feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Dragon Cultist', 'A background from FRHoF', '["Deception","Stealth"]'::jsonb, '["Calligrapher''s supplies"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Earthspur Miner', 'A background from ALElementalEvil', '["Athletics","Survival"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Deep Miner', 'You are used to navigating the deep places of the earth. You never get lost in caves or mines if you have either seen an accurate map of them or have been through them before. Furthermore, you are able to scrounge fresh water and food for yourself and as many as five other people each day if you are in a mine or natural caves. Note: This feature is a variant of the Outlander feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Emerald Enclave Caretaker', 'A background from FRHoF', '["Nature","Survival"]'::jsonb, '["Herbalism kit"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Entertainer', 'A background from PHB', '["Acrobatics","Performance"]'::jsonb, '["Disguise kit"]'::jsonb, '[]'::jsonb, 'By Popular Demand', 'You can always find a place to perform, usually in an inn or tavern but possibly with a circus, at a theater, or even in a noble''s court. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night. In addition, your performance makes you something of a local figure. When strangers recognize you in a town where you have performed, they typically take a liking to you.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Entertainer', 'A background from XPHB', '["Acrobatics","Performance"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Faceless', 'A background from BGDIA', '["Deception","Intimidation"]'::jsonb, '["Disguise kit"]'::jsonb, '[]'::jsonb, 'Dual Personalities', 'Most of your fellow adventurers and the world know you as your persona. Those who seek to learn more about you—your weaknesses, your origins, your purpose—find themselves stymied by your disguise. Upon donning a disguise and behaving as your persona, you are unidentifiable as your true self. By removing your disguise and revealing your true face, you are no longer identifiable as your persona. This allows you to change appearances between your two personalities as often as you wish, using one to hide the other or serve as convenient camouflage. However, should someone realize the connection between your persona and your true self, your deception might lose its effectiveness.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Faction Agent', 'A background from SCAG', '["Insight","Choose from list"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Safe Haven', 'As a faction agent, you have access to a secret network of supporters and operatives who can provide assistance on your adventures. You know a set of secret signs and passwords you can use to identify such operatives, who can provide you with access to a hidden safe house, free room and board, or assistance in finding information. These agents never risk their lives for you or risk revealing their true identities.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Failed Merchant', 'A background from AI', '["Investigation","Persuasion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Supply Chain', 'From your time as a merchant, you retain connections with wholesalers, suppliers, and other merchants and entrepreneurs. You can call upon these connections when looking for items or information.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Far Traveler', 'A background from SCAG', '["Insight","Perception"]'::jsonb, '["Choose tool"]'::jsonb, '[]'::jsonb, 'All Eyes on You', 'Your accent, mannerisms, figures of speech, and perhaps even your appearance all mark you as foreign. Curious glances are directed your way wherever you go, which can be a nuisance, but you also gain the friendly interest of scholars and others intrigued by far-off lands, to say nothing of everyday folk who are eager to hear stories of your homeland.
You can parley this attention into access to people and places you might not otherwise have, for you and your traveling companions. Noble lords, scholars, and merchant princes, to name a few, might be interested in hearing about your distant homeland and people.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Farmer', 'A background from XPHB', '["Animal handling","Nature"]'::jsonb, '["Carpenter''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Feylost', 'A background from WBtW', '["Deception","Survival"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Feywild Connection', 'Your mannerisms and knowledge of fey customs are recognized by natives of the Feywild, who see you as one of their own. Because of this, friendly Fey creatures are inclined to come to your aid if you are lost or need help in the Feywild.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Fisher', 'A background from GoS', '["History","Survival"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Harvest the Water', 'You gain advantage on ability checks made using fishing tackle. If you have access to a body of water that sustains marine life, you can maintain a moderate lifestyle while working as a fisher, and you can catch enough food to feed yourself and up to ten other people each day.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Flaming Fist Mercenary', 'A background from FRHoF', '["Intimidation","Perception"]'::jsonb, '["Smith''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Folk Hero', 'A background from PHB', '["Animal handling","Survival"]'::jsonb, '["Vehicles (land)"]'::jsonb, '[]'::jsonb, 'Rustic Hospitality', 'Since you come from the ranks of the common folk, you fit in among them with ease. You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you, though they will not risk their lives for you.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Gambler', 'A background from AI', '["Deception","Insight"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Never Tell Me the Odds', 'Odds and probability are your bread and butter. During downtime activities that involve games of chance or figuring odds on the best plan, you can get a solid sense of which choice is likely the best one and which opportunities seem too good to be true, at the DM''s determination.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Gate Urchin', 'A background from ALRageOfDemons', '["Deception","Sleight of hand"]'::jsonb, '["Thieves'' tools"]'::jsonb, '[]'::jsonb, 'Red Plume and Mage Guild Contacts', 'You made a number of friends among the Red Plumes and the Mage''s Guild when you lived at the Hillsfar Gate. They remember you fondly and help you in little ways when they can. You can invoke their assistance in and around Hillsfar to obtain food, as well as simple equipment for temporary use. You can also invoke it to gain access to the low-security areas of their garrisons, halls, and encampments. Note: This feature is a variant of the Soldier feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Gate Warden', 'A background from SatO', '["Persuasion","Survival"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Planar Infusion', 'Living in a gate-town or a similar location steeped you in planar energy. You gain the Scion of the Outer Planes feat. In addition, you know where to find free, modest lodging and food in the community you grew up in.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Genie Touched', 'A background from FRHoF', '["Perception","Persuasion"]'::jsonb, '["Glassblower''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Giant Foundling', 'A background from BGG', '["Intimidation","Survival"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Strike of the Giants', 'You gain the Strike of the Giants feat.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Golgari Agent', 'A background from GGR', '["Nature","Survival"]'::jsonb, '["Poisoner''s kit"]'::jsonb, '[]'::jsonb, 'Undercity Paths', 'You know hidden, underground pathways that you can use to bypass crowds, obstacles, and observation as you move through the city. When you aren''t in combat, you and companions you lead can travel between any two locations in the city twice as fast as your speed would normally allow. The paths of the undercity are haunted by dangers that rarely brave the light of the surface world, so your journey isn''t guaranteed to be safe.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Grinner', 'A background from EGW', '["Deception","Performance"]'::jsonb, '["Thieves'' tools"]'::jsonb, '[]'::jsonb, 'Ballad of the Grinning Fool', 'Like every Grinner, you know how to find a hideout. In any city of 10,000 people or more on the Menagerie Coast or in the lands of the Dwendalian Empire, you can play the "Ballad of the Grinning Fool" in a major tavern or inn. A member of the Golden Grin will find you and give shelter to you and any companions you vouch for. This shelter might be discontinued if it becomes too dangerous to hide you, at the DM''s discretion.
This feature must be used with caution, for not all who know the ballad are your friends. Some are traitors, counterspies, or agents of tyranny.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Gruul Anarch', 'A background from GGR', '["Animal handling","Athletics"]'::jsonb, '["Herbalism kit"]'::jsonb, '[]'::jsonb, 'Rubblebelt Refuge', 'You are intimately familiar with areas of the city that most people shun: ruined neighborhoods where wurms rampaged, overgrown parks that no hand has tended in decades, and the vast, sprawling rubblebelts of broken terrain that civilized folk have long abandoned. You can find a suitable place for you and your allies to hide or rest in these areas. In addition, you can find food and fresh water in these areas for yourself and up to five other people each day.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Guard', 'A background from XPHB', '["Athletics","Perception"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Guide', 'A background from XPHB', '["Stealth","Survival"]'::jsonb, '["Cartographer''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Guild Artisan', 'A background from PHB', '["Insight","Persuasion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Guild Membership', 'As an established and respected member of a guild, you can rely on certain benefits that membership provides. Your fellow guild members will provide you with lodging and food if necessary, and pay for your funeral if needed. In some cities and towns, a guildhall offers a central place to meet other members of your profession, which can be a good place to meet potential patrons, allies, or hirelings.
Guilds often wield tremendous political power. If you are accused of a crime, your guild will support you if a good case can be made for your innocence or the crime is justifiable. You can also gain access to powerful political figures through the guild, if you are a member in good standing. Such connections might require the donation of money or magic items to the guild''s coffers.
You must pay dues of 5 gp per month to the guild. If you miss payments, you must make up back dues to remain in the guild''s good graces.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Harborfolk', 'A background from ALElementalEvil', '["Athletics","Sleight of hand"]'::jsonb, '["Vehicles (water)"]'::jsonb, '[]'::jsonb, 'Harborfolk', 'You grew up on the docks and waters of Mulmaster Harbor. The harborfolk remember you and still treat you as one of them. They welcome you and your companions. While they might charge you for it, they''ll always offer what food and shelter they have; they''ll even hide you if the City Watch is after you (but not if the Hawks are). Note: This feature is a variant of the Folk Hero feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Harper', 'A background from FRHoF', '["Performance","Sleight of hand"]'::jsonb, '["Disguise kit"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Haunted One', 'A background from VRGR', '["Choose from list"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Heart of Darkness', 'Those who look into your eyes can see that you have faced unimaginable horror and that you are no stranger to darkness. Though they might fear you, commoners will extend you every courtesy and do their utmost to help you. Unless you have shown yourself to be a danger to them, they will even take up arms to fight alongside you, should you find yourself facing an enemy alone.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Hermit', 'A background from PHB', '["Medicine","Religion"]'::jsonb, '["Herbalism kit"]'::jsonb, '[]'::jsonb, 'Discovery', 'The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery. The exact nature of this revelation depends on the nature of your seclusion. It might be a great truth about the cosmos, the deities, the powerful beings of the outer planes, or the forces of nature. It could be a site that no one else has ever seen. You might have uncovered a fact that has long been forgotten, or unearthed some relic of the past that could rewrite history. It might be information that would be damaging to the people who or consigned you to exile, and hence the reason for your return to society.
Work with your DM to determine the details of your discovery and its impact on the campaign.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Hermit', 'A background from XPHB', '["Medicine","Religion"]'::jsonb, '["Herbalism kit"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Hillsfar Merchant', 'A background from ALRageOfDemons', '["Insight","Persuasion"]'::jsonb, '["Vehicles (land)","Vehicles (water)"]'::jsonb, '[]'::jsonb, 'Factor', 'Although you''ve left the day-to-day life of a merchant behind, your family has assigned you the services of a loyal retainer from the business, a factor, husbanding agent, seafarer, caravan guard, or clerk. This individual is a commoner who can perform mundane tasks for you such as making purchases, delivering messages, and running errands. He or she will not fight for you and will not follow you into obviously dangerous areas (such as dungeons), and will leave if frequently endangered or abused. If he or she is killed, the family assigns you another within a few days. Note: This feature is a variant of the Noble Knight''s Retainers feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Hillsfar Smuggler', 'A background from ALRageOfDemons', '["Perception","Stealth"]'::jsonb, '["Forgery kit"]'::jsonb, '[]'::jsonb, 'Secret Passage', 'You can call on your contacts within the smuggling community to secure secret passage into or out of Hillsfar for yourself and your adventuring companions, no questions asked, and no Red Plume entanglements. Because you''re calling in a favor, you can''t be certain they will be able to help on your timetable or at all. Your Dungeon Master will determine whether you can be smuggled into or out of the city. In return for your passage, you and your companions may owe the Rouges Guild a favor and/or may have to pay bribes. Note: This feature is a variant of the Sailor feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Agent', 'A background from EFA', '["Investigation","Persuasion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Agent', 'A background from ERLW', '["Investigation","Persuasion"]'::jsonb, '["Alchemist''s supplies","Tinker''s tools","Vehicles (land)","Brewer''s supplies","Cook''s utensils","Herbalism kit","Thieves'' tools","Vehicles (water)","Vehicles (air)","Navigator''s tools","Disguise kit","Calligrapher''s supplies","Forgery kit","Poisoner''s kit"]'::jsonb, '[]'::jsonb, 'House Connections', 'As an agent of your house, you can always get food and lodging for yourself and your friends at a house enclave. When the house assigns you a mission, it will usually provide you with the necessary supplies and transportation. Beyond this, you have many old friends, mentors, and rivals in your house, and you may encounter one of them when you interact with a house business. The degree to which such acquaintances are willing to help you depends on your current standing in your house.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Cannith Heir', 'A background from EFA', '["Investigation","Sleight of hand"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Deneith Heir', 'A background from EFA', '["Insight","Perception"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Ghallanda Heir', 'A background from EFA', '["Insight","Persuasion"]'::jsonb, '["Cook''s utensils"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Jorasco Heir', 'A background from EFA', '["Medicine","Stealth"]'::jsonb, '["Herbalism kit"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Kundarak Heir', 'A background from EFA', '["Arcana","Investigation"]'::jsonb, '["Thieves'' tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Lyrandar Heir', 'A background from EFA', '["Acrobatics","Nature"]'::jsonb, '["Navigator''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Medani Heir', 'A background from EFA', '["Insight","Investigation"]'::jsonb, '["Disguise kit"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Orien Heir', 'A background from EFA', '["Acrobatics","Athletics"]'::jsonb, '["Cartographer''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Phiarlan Heir', 'A background from EFA', '["Deception","Stealth"]'::jsonb, '["Disguise kit"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Sivis Heir', 'A background from EFA', '["History","Perception"]'::jsonb, '["Calligrapher''s supplies"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Tharashk Heir', 'A background from EFA', '["Perception","Survival"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Thuranni Heir', 'A background from EFA', '["Performance","Stealth"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('House Vadalis Heir', 'A background from EFA', '["Animal handling","Nature"]'::jsonb, '["Herbalism kit"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Ice Fisher', 'A background from FRHoF', '["Animal handling","Athletics"]'::jsonb, '["Woodcarver''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Inheritor', 'A background from SCAG', '["Survival","Choose from list"]'::jsonb, '["Choose tool"]'::jsonb, '[]'::jsonb, 'Inheritance', 'Choose or randomly determine your inheritance from the possibilities in the table below. Work with your Dungeon Master to come up with details: Why is your inheritance so important, and what is its full story? You might prefer for the DM to invent these details as part of the game, allowing you to learn more about your inheritance as your character does.
The Dungeon Master is free to use your inheritance as a story hook, sending you on quests to learn more about its history or true nature, or confronting you with foes who want to claim it for themselves or prevent you from learning what you seek. The DM also determines the properties of your inheritance and how they figure into the item''s history and importance. For instance, the object might be a minor magic item, or one that begins with a modest ability and increases in potency with the passage of time. Or, the true nature of your inheritance might not be apparent at first and is revealed only when certain conditions are met.
When you begin your adventuring career, you can decide whether to tell your companions about your inheritance right away. Rather than attracting attention to yourself, you might want to keep your inheritance a secret until you learn more about what it means to you and what it can do for you.
[object Object]')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Initiate', 'A background from PSA', '["Athletics","Intimidation"]'::jsonb, '["Vehicles (land)"]'::jsonb, '[]'::jsonb, 'Trials of the Five Gods', 'Your life is oriented around your participation in the five trials that will determine your worthiness in the afterlife. While you prepare for and undergo those trials, you have constant access to training. A comfortable place to live and regular meals are provided to you by servitor mummies (the anointed) under the supervision of viziers. You can enjoy these benefits only as long as you obey the societal norms of Naktamun—training for the trials (with or without your crop), obeying the orders of the gods, and following the instructions of their viziers. If you violate these norms, you risk being treated as a dissenter. See "Trials of the Five Gods" for more information about undertaking the trials and their rewards.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Inquisitive', 'A background from EFA', '["Insight","Investigation"]'::jsonb, '["Thieves'' tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Inquisitor', 'A background from PSI', '["Investigation","Religion"]'::jsonb, '["Thieves'' tools"]'::jsonb, '[]'::jsonb, 'Legal Authority', 'As an inquisitor of the church, you have the authority to arrest criminals. In the absence of other authorities, you are authorized to pass judgement and even carry out sentencing. If you abuse this power, however, your superiors in the church might strip it from you.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Investigator', 'A background from VRGR', '["Choose from list"]'::jsonb, '["Disguise kit","Thieves'' tools"]'::jsonb, '[]'::jsonb, 'Official Inquiry', 'You''re experienced at gaining access to people and places to get the information you need. Through a combination of fast-talking, determination, and official-looking documentation, you can gain access to a place or an individual related to a crime you''re investigating. Those who aren''t involved in your investigation avoid impeding you or pass along your requests. Additionally, local law enforcement has firm opinions about you, viewing you as either a nuisance or one of their own.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Iron Route Bandit', 'A background from ALCurseOfStrahd', '["Animal handling","Stealth"]'::jsonb, '["Vehicles (land)"]'::jsonb, '[]'::jsonb, 'Black-Market Breeder', 'You know how to find people who are always looking for stolen animals & vehicles, whether to provide for animal pit fights, or to supply some desperate rogues the means to get away faster on mounts during an illegal job. This contact not only provides you with information of what such animals & vehicles are in high demand in the area, but also offer to give you favors and information (DM choice) if you bring such animals & vehicles to them. Note: This is a variant of the Criminal Contact feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Izzet Engineer', 'A background from GGR', '["Arcana","Investigation"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Urban Infrastructure', 'The popular conception of the Izzet League is based on mad inventions, dangerous experiments, and explosive blasts. Much of that perception is accurate, but the league is also involved with mundane tasks of construction and architecture—primarily in crafting the infrastructure that allows Ravnicans to enjoy running water, levitating platforms, and other magical and technological wonders.
You have a basic knowledge of the structure of buildings, including the stuff behind the walls. You can also find blueprints of a specific building in order to learn the details of its construction. Such blueprints might provide knowledge of entry points, structural weaknesses, or secret spaces. Your access to such information isn''t unlimited. If obtaining or using the information gets you in trouble with the law, the guild can''t shield you from the repercussions.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Knight of Solamnia', 'A background from DSotDQ', '["Athletics","Survival"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Squire of Solamnia', 'You gain the Squire of Solamnia feat.
In addition, the Knights of Solamnia provide you free, modest lodging and food at any of their fortresses or encampments.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Knight of the Gauntlet', 'A background from FRHoF', '["Athletics","Medicine"]'::jsonb, '["Smith''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Knight of the Order', 'A background from SCAG', '["Persuasion","Choose from list"]'::jsonb, '["Choose tool"]'::jsonb, '[]'::jsonb, 'Knightly Regard', 'You receive shelter and succor from members of your knightly order and those who are sympathetic to its aims. If your order is a religious one, you can gain aid from temples and other religious communities of your deity. Knights of civic orders can get help from the community—whether a lone settlement or a great nation—that they serve, and knights of philosophical orders can find help from those they have aided in pursuit of their ideals, and those who share their ideals.
This help comes in the form of shelter and meals, and healing when appropriate, as well as occasionally risky assistance, such as a band of local citizens rallying to aid a sorely pressed knight, or those who support the order helping to smuggle a knight out of town when he or she is being hunted unjustly.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Lords'' Alliance Vassal', 'A background from FRHoF', '["Insight","Persuasion"]'::jsonb, '["Calligrapher''s supplies"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Lorehold Student', 'A background from SCC', '["History","Religion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Lorehold Initiate', 'You gain the Strixhaven Initiate feat and must choose Lorehold within it.
In addition, if you have the Spellcasting or Pact Magic feature, the spells on the Lorehold Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.)
[object Object]
Consider customizing how your spells look when you cast them. Your Lorehold spells might create displays of golden light. You might use a tome or a scroll as a spellcasting focus, and your spell effects might reflect the appearance of the reference books you study.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Lorwyn Expert', 'A background from LFL', '["Athletics","Nature"]'::jsonb, '["Cartographer''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Mage of High Sorcery', 'A background from DSotDQ', '["Arcana","History"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Initiate of High Sorcery', 'You gain the Initiate of High Sorcery feat.
In addition, the Mages of High Sorcery provide you with free, modest lodging and food indefinitely at any occupied Tower of High Sorcery and for one night at the home of an organization member.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Marine', 'A background from GoS', '["Athletics","Survival"]'::jsonb, '["Vehicles (water)","Vehicles (land)"]'::jsonb, '[]'::jsonb, 'Steady', 'You can move twice the normal amount of time (up to 16 hours) each day before being subject to the effect of a forced march (see "Travel Pace" in chapter 8 of the Player''s Handbook). Additionally, you can automatically find a safe route to land a boat on shore, provided such a route exists.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Mercenary Veteran', 'A background from SCAG', '["Athletics","Persuasion"]'::jsonb, '["Vehicles (land)"]'::jsonb, '[]'::jsonb, 'Mercenary Life', 'You know the mercenary life as only someone who has experienced it can. You are able to identify mercenary companies by their emblems, and you know a little about any such company, including who has hired them recently. You can find the taverns and festhalls where mercenaries abide in any area, as long as you speak the language. You can find mercenary work between adventures sufficient to maintain a comfortable lifestyle (see "Practicing a Profession" under "Downtime Activities" in chapter 8 of the Player''s Handbook).')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Merchant', 'A background from XPHB', '["Animal handling","Persuasion"]'::jsonb, '["Navigator''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Moonwell Pilgrim', 'A background from FRHoF', '["Nature","Performance"]'::jsonb, '["Painter''s supplies"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Mulhorandi Tomb Raider', 'A background from FRHoF', '["Investigation","Religion"]'::jsonb, '["Mason''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Mulmaster Aristocrat', 'A background from ALElementalEvil', '["Deception","Performance"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Highborn', 'Mulmaster is run by and for its aristocracy. Every other class of citizen in the city defers to you, and even the priesthood, Soldiery, Hawks, and Cloaks treat you with deference. Other aristocrats and nobles accept you in their circles and likely know you or of you. Your connections can get you the ear of a Zor or Zora under the right circumstances. Note: This feature is a variant of the Noble feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Mythalkeeper', 'A background from FRHoF', '["Arcana","History"]'::jsonb, '["Jeweler''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Noble', 'A background from PHB', '["History","Persuasion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Position of Privilege', 'Thanks to your noble birth, people are inclined to think the best of you. You are welcome in high society, and people assume you have the right to be wherever you are. The common folk make every effort to accommodate you and avoid your displeasure, and other people of high birth treat you as a member of the same social sphere. You can secure an audience with a local noble if you need to.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Noble', 'A background from XPHB', '["History","Persuasion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Orzhov Representative', 'A background from GGR', '["Intimidation","Religion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Leverage', 'You can exert leverage over one or more individuals below you in the guild''s hierarchy and demand their help as needs warrant. For example, you can have a message carried across a neighborhood, procure a short carriage ride without paying, or have others clean up a bloody mess you left in an alley. The DM decides if your demands are reasonable and if there are subordinates available to fulfill them. As your status in the guild improves, you gain influence over more people, including ones in greater positions of power.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Outlander', 'A background from PHB', '["Athletics","Survival"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Wanderer', 'You have an excellent memory for maps and geography, and you can always recall the general layout of terrain, settlements, and other features around you. In addition, you can find food and fresh water for yourself and up to five other people each day, provided that the land offers berries, small game, water, and so forth.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Phlan Insurgent', 'A background from ALCurseOfStrahd', '["Stealth","Survival"]'::jsonb, '["Vehicles (land)"]'::jsonb, '[]'::jsonb, 'Guerrilla', 'You''ve come to know the surrounding forests, streams, caves, and other natural features in which you can take refuge—or set up ambushes. You can quickly survey your environment for advantageous features. Additionally, you can scavenge around your natural surroundings to cobble together simple supplies (such as improvised torches, rope, patches of fabric, etc.) that are consumed after use. Note: This feature is a variant of the Outlander feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Phlan Refugee', 'A background from ALElementalEvil', '["Insight","Athletics"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Phlan Survivor', 'Whatever your prior standing was, you are now one of the many refugees that have come to Mulmaster. You are able to find refuge with others from Phlan and those who sympathize with your plight. Within Mulmaster this means that you can find a place to bed down, recover, and hide from the watch with either other refugees from Phlan, or the Zhents within the ghettos. Note: This feature is a variant of the Folk Hero feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Plaintiff', 'A background from AI', '["Medicine","Persuasion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Legalese', 'Your experience with your local legal system has given you a firm knowledge of the ins and outs of that system. Even when the law is not on your side, you can use complex terms like ex injuria jus non oritur and cogitationis poenam nemo patitur to frighten people into thinking you know what you''re talking about. With common folks who don''t know any better, you might be able to intimidate or deceive to get favors or special treatment.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Planar Philosopher', 'A background from SatO', '["Arcana","Choose from list"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Conviction', 'You gain the Scion of the Outer Planes feat. In addition, members of your organization provide you free, modest lodging and food at any of their holdings or the homes of other faction members.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Prismari Student', 'A background from SCC', '["Acrobatics","Performance"]'::jsonb, '["Choose tool"]'::jsonb, '[]'::jsonb, 'Prismari Initiate', 'You gain the Strixhaven Initiate feat and must choose Prismari within it.
In addition, if you have the Spellcasting or Pact Magic feature, the spells on the Prismari Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.)
[object Object]
Consider customizing how your spells look when you cast them. You might wield your Prismari spells with dynamic, gestural movement—as much dance as somatic component. Even a blast of fire in your hands is a sculpted work of art; elemental forces make grand designs as you hurl spells. These forces might linger on your body or in your clothes as decorative elements after your spells are dissipated, as sparks dance in your hair and your touch leaves tracings of frost on whatever you touch.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Purple Dragon Squire', 'A background from FRHoF', '["Animal handling","Insight"]'::jsonb, '["Navigator''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Quandrix Student', 'A background from SCC', '["Arcana","Nature"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Quandrix Initiate', 'You gain the Strixhaven Initiate feat and must choose Quandrix within it.
In addition, if you have the Spellcasting or Pact Magic feature, the spells on the Quandrix Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.)
[object Object]
Consider customizing how your spells look when you cast them. Your Quandrix spells might manifest amid kaleidoscopic swirls of fractal patterns, amplifying the tiniest movements of your somatic components. When your magic creates or alters creatures, it might briefly surround the targets with shimmering fractal designs or tessellated patterns.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Rakdos Cultist', 'A background from GGR', '["Acrobatics","Performance"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Fearsome Reputation', 'People recognize you as a member of the Cult of Rakdos, and they''re careful not to draw your anger or ridicule. You can get away with minor criminal offenses, such as refusing to pay for food at a restaurant or breaking down a door at a local shop, if no legal authorities witness the crime. Most people are too daunted by you to report your wrongdoing to the Azorius.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Rashemi Wanderer', 'A background from FRHoF', '["Intimidation","Perception"]'::jsonb, '["Cartographer''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Rewarded', 'A background from BMT', '["Insight","Persuasion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Fortune''s Favor', 'Your unexpected good fortune is reflected by a minor boon. You gain the Lucky, Magic Initiate, or Skilled feat (your choice). Your choice of feat reflects the transformation that changed your life. An encounter with a genie who gave you three wishes might have resulted in magical powers represented by Magic Initiate. If you paid off all your family debts with a fortuitous round of three-dragon ante, you might be Lucky instead. Alternatively, you could use the Skilled feat to reflect whatever trial you endured to secure your new destiny and to model the knowledge and abilities imparted to you by whatever force transformed your life.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Rival Intern', 'A background from AI', '["History","Investigation"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Inside Informant', 'You have connections to your previous employer or other groups you dealt with during your previous employment. You can communicate with your contacts, gaining information at the DM''s discretion.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Ruined', 'A background from BMT', '["Stealth","Survival"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Still Standing', 'You have weathered ruinous misfortune, and you possess hidden reserves others don''t expect. You gain the Alert, Skilled, or Tough feat (your choice). Your choice of feat reflects how you''ve dealt with the terrible loss that changed your life forever. If you''ve kept your senses sharp for every opportunity and climbed your way out of misery by seizing the tiniest scrap of hope, choose Alert. If you''ve redoubled your efforts to reclaim what was once yours, choose Skilled. If you''ve stoically persevered through your misfortune, select Tough.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Rune Carver', 'A background from BGG', '["History","Perception"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Rune Shaper', 'You gain the Rune Shaper feat.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Sage', 'A background from PHB', '["Arcana","History"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Researcher', 'When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it. Usually, this information comes from a library, scriptorium, university, or a sage or other learned person or creature. Your DM might rule that the knowledge you seek is secreted away in an almost inaccessible place, or that it simply cannot be found. Unearthing the deepest secrets of the multiverse can require an adventure or even a whole campaign.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Sage', 'A background from XPHB', '["Arcana","History"]'::jsonb, '["Calligrapher''s supplies"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Sailor', 'A background from PHB', '["Athletics","Perception"]'::jsonb, '["Navigator''s tools","Vehicles (water)"]'::jsonb, '[]'::jsonb, 'Ship''s Passage', 'When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions. You might sail on the ship you served on, or another ship you have good relations with (perhaps one captained by a former crewmate). Because you''re calling in a favor, you can''t be certain of a schedule or route that will meet your every need. Your Dungeon Master will determine how long it takes to get where you need to go. In return for your free passage, you and your companions are expected to assist the crew during the voyage.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Sailor', 'A background from XPHB', '["Acrobatics","Perception"]'::jsonb, '["Navigator''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Scribe', 'A background from XPHB', '["Investigation","Perception"]'::jsonb, '["Calligrapher''s supplies"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Secret Identity', 'A background from ALRageOfDemons', '["Deception","Stealth"]'::jsonb, '["Disguise kit","Forgery kit"]'::jsonb, '[]'::jsonb, 'Secret Identity', 'You have created a secret identity that you use to conceal your true race and that offers a covering explanation for your presence in Hillsfar. In addition, you can forge documents, including official papers and personal letters, as long as you have seen an example of the kind of document or the handwriting you are trying to copy Note: This feature is a variant of the Charlatan feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Selesnya Initiate', 'A background from GGR', '["Nature","Persuasion"]'::jsonb, '["Choose tool"]'::jsonb, '[]'::jsonb, 'Conclave''s Shelter', 'As a member of the Selesnya Conclave, you can count on your guild mates to provide shelter and aid. You and your companions can find a place to hide or rest in any Selesnya enclave in the city, unless you have proven to be a danger to them. The members of the enclave will shield you from the law or anyone else searching for you, though they will not risk their lives in this effort.
In addition, as a guild member you can receive free healing and care at a Selesnya enclave, though you must provide any material components needed for spells.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Shade Fanatic', 'A background from ALRageOfDemons', '["Deception","Intimidation"]'::jsonb, '["Forgery kit"]'::jsonb, '[]'::jsonb, 'Secret Society', 'You have a special way of communicating with others who feel the same way you do about the Shade. When you enter a village or larger city you can identify contact who will give you information on those that would hinder your goals and those would help you simply because of your desire to see the Shade Enclave return in all its glory. Note: This feature is a variant of the Criminal feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Shadowmasters Exile', 'A background from FRHoF', '["Acrobatics","Stealth"]'::jsonb, '["Thieves'' tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Shadowmoor Expert', 'A background from LFL', '["Acrobatics","Deception"]'::jsonb, '["Glassblower''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Shipwright', 'A background from GoS', '["History","Perception"]'::jsonb, '["Carpenter''s tools","Vehicles (water)"]'::jsonb, '[]'::jsonb, 'I''ll Patch It!', 'Provided you have carpenter''s tools and wood, you can perform repairs on a water vehicle. When you use this ability, you restore a number of hit points to the hull of a water vehicle equal to 5 × your proficiency modifier. A vehicle cannot be patched by you in this way again until after it has been pulled ashore and fully repaired.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Silverquill Student', 'A background from SCC', '["Intimidation","Persuasion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Silverquill Initiate', 'You gain the Strixhaven Initiate feat and must choose Silverquill within it.
In addition, if you have the Spellcasting or Pact Magic feature, the spells on the Silverquill Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.)
[object Object]
Consider customizing how your spells look when you cast them. Your Silverquill spells might be accompanied by visual effects resembling splotches of ink or radiating ripples of golden light. Any auditory effects of your spells often sound like amplified echoes of your own voice speaking the spells'' verbal components—even amid the crash of lightning or a fiery eruption.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Simic Scientist', 'A background from GGR', '["Arcana","Medicine"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Researcher', 'When you attempt to learn or recall a magical or scientific fact, if you don''t know that information, you know where and from whom you can obtain it. Usually, this information comes from a Simic laboratory, or sometimes from an Izzet facility, a library, a university, or an independent scholar or other learned person or creature. Knowing where the information can be found doesn''t automatically enable you to learn it; you might need to offer bribes, favors, or other incentives to induce people to reveal their secrets.
Your DM might rule that the knowledge you seek is secreted away in an inaccessible place, or that it simply can''t be found. Unearthing the deepest secrets of the multiverse can require an adventure or even a whole campaign.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Smuggler', 'A background from GoS', '["Athletics","Deception"]'::jsonb, '["Vehicles (water)"]'::jsonb, '[]'::jsonb, 'Down Low', 'You are acquainted with a network of smugglers who are willing to help you out of tight situations. While in a particular town, city, or other similarly sized community (DM''s discretion), you and your companions can stay for free in safe houses. Safe houses provide a poor lifestyle. While staying at a safe house, you can choose to keep your presence (and that of your companions) a secret.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Soldier', 'A background from PHB', '["Athletics","Intimidation"]'::jsonb, '["Vehicles (land)"]'::jsonb, '[]'::jsonb, 'Military Rank', 'You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence, and they defer to you if they are of a lower rank. You can invoke your rank to exert influence over other soldiers and requisition simple equipment or horses for temporary use. You can also usually gain access to friendly military encampments and fortresses where your rank is recognized.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Soldier', 'A background from XPHB', '["Athletics","Intimidation"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Spellfire Initiate', 'A background from FRHoF', '["Arcana","Perception"]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Stojanow Prisoner', 'A background from ALCurseOfStrahd', '["Deception","Perception"]'::jsonb, '["Thieves'' tools"]'::jsonb, '[]'::jsonb, 'Ex-Convict', 'The knowledge gained during your incarceration lets you gain insight into local guards and jailors. You know which will accept bribes, or look the other way for you. You can also seek shelter for yourself from authorities with other criminals in the area. Note: This feature is a variant of the Courtier feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Ticklebelly Nomad', 'A background from ALCurseOfStrahd', '["Animal handling","Nature"]'::jsonb, '["Herbalism kit"]'::jsonb, '[]'::jsonb, 'At Home in the Wild', 'The wilderness is your home and you are comfortable dwelling in it. You can find a place to hide, rest, or recuperate when out in the wild. This place of rest is secure enough to conceal you from most natural threats. Threats that are supernatural, magical, or are actively seeking you out might do so with difficulty depending on the nature of the threat (as determined by the DM). However, this feature doesn''t shield or conceal you from scrying, mental probing, nor from threats that don''t necessarily require the five senses to find you. Note: This feature is a variant of the Folk Hero feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Trade Sheriff', 'A background from ALRageOfDemons', '["Investigation","Persuasion"]'::jsonb, '["Thieves'' tools"]'::jsonb, '[]'::jsonb, 'Investigative Services', 'You are part of a small force outside of Hillsfar. You have a special way of communicating with others and they seem to be at ease around you. You can invoke your rank to allow you access to a crime scene or to requisition equipment or horses on a temporary basis. When you enter a town or village around Hillsfar you can identify a contact who will give you information on the local rumors and would help you simply because of your desire to get answers and information for anyone wanting to disrupt trade. Note: This feature is a variant of the soldier feature.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Urban Bounty Hunter', 'A background from SCAG', '["Choose from list"]'::jsonb, '["Choose tool"]'::jsonb, '[]'::jsonb, 'Ear to the Ground', 'You are in frequent contact with people in the segment of society that your chosen quarries move through. These people might be associated with the criminal underworld, the rough-and-tumble folk of the streets, or members of high society. This connection comes in the form of a contact in any city you visit, a person who provides information about the people and places of the local area.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Urchin', 'A background from PHB', '["Sleight of hand","Stealth"]'::jsonb, '["Disguise kit","Thieves'' tools"]'::jsonb, '[]'::jsonb, 'City Secrets', 'You know the secret patterns and flow to cities and can find passages through the urban sprawl that others would miss. When you are not in combat, you (and companions you lead) can travel between any two locations in the city twice as fast as your speed would normally allow.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Uthgardt Tribe Member', 'A background from SCAG', '["Athletics","Survival"]'::jsonb, '["Choose tool"]'::jsonb, '[]'::jsonb, 'Uthgardt Heritage', 'You have an excellent knowledge of not only your tribe''s territory, but also the terrain and natural resources of the rest of the North. You are familiar enough with any wilderness area that you can find twice as much food and water as you normally would when you forage there.
Additionally, you can call upon the hospitality of your people, and those allied with your tribe, often including members of the druid circles, tribes of nomadic elves, the Harpers, and the priesthoods devoted to the gods of the First Circle.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Vampire Devotee', 'A background from ABH', '["Persuasion","Stealth"]'::jsonb, '["Cook''s utensils"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Vampire Survivor', 'A background from ABH', '["Insight","Religion"]'::jsonb, '["Woodcarver''s tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Variant City Watch (Investigator)', 'A background from SCAG', '["Insight","Investigation"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Watcher''s Eye', 'Your experience in enforcing the law, and dealing with lawbreakers, gives you a feel for local laws and criminals. You can easily find the local outpost of the watch or a similar organization, and just as easily pick out the dens of criminal activity in a community, although you''re more likely to be welcome in the former locations rather than the latter.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Vizier', 'A background from PSA', '["History","Religion"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'Voice of Authority', 'Your voice is the voice of your god, at least in theory. Your job might include training and instructing initiates, and they are required to obey you. In any circumstance, an initiate is expected to defer to your voice and obey your commands. If you abuse this authority, though, your god might personally punish you.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Volstrucker Agent', 'A background from EGW', '["Deception","Stealth"]'::jsonb, '["Poisoner''s kit"]'::jsonb, '[]'::jsonb, 'Shadow Network', 'You have access to the Volstrucker shadow network, which allows you to communicate with other members of the order over long distances. If you write a letter in a special arcane ink, address it to a member of the Volstrucker, and cast it into a fire, the letter will burn to cinders and materialize whole again on the person of the agent you addressed it to.
The ink used to send a letter across the shadow network is the same as that used by a wizard to scribe spells in a spellbook. Writing a letter in this ink costs 10 gp per page.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Waterdhavian Noble', 'A background from SCAG', '["History","Persuasion"]'::jsonb, '["Choose tool"]'::jsonb, '[]'::jsonb, 'Kept in Style', 'While you are in Waterdeep or elsewhere in the North, your house sees to your everyday needs. Your name and signet are sufficient to cover most of your expenses; the inns, taverns, and festhalls you frequent are glad to record your debt and send an accounting to your family''s estate in Waterdeep to settle what you owe.
This advantage enables you to live a comfortable lifestyle without having to pay 2 gp a day for it, or reduces the cost of a wealthy or aristocratic lifestyle by that amount. You may not maintain a less affluent lifestyle and use the difference as income—the benefit is a line of credit, not an actual monetary reward.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Wayfarer', 'A background from XPHB', '["Insight","Stealth"]'::jsonb, '["Thieves'' tools"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Wildspacer', 'A background from AAG', '["Athletics","Survival"]'::jsonb, '["Navigator''s tools","Vehicles (space)"]'::jsonb, '[]'::jsonb, 'Wildspace Adaptation', 'You gain the Tough from the Player''s Handbook. In addition, you learned how to adapt to zero gravity. Being weightless doesn''t give you disadvantage on any of your melee attack rolls (see "Weightlessness" in chapter 2).')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Witchlight Hand', 'A background from WBtW', '["Performance","Sleight of hand"]'::jsonb, '["Choose tool"]'::jsonb, '[]'::jsonb, 'Carnival Fixture', 'The Witchlight Carnival provides you with free, modest lodging and food. In addition, you may wander about the carnival and partake of its many wonders at no cost to you, provided you don''t disrupt its shows or cause any other trouble.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Witherbloom Student', 'A background from SCC', '["Nature","Survival"]'::jsonb, '["Herbalism kit"]'::jsonb, '[]'::jsonb, 'Witherbloom Initiate', 'You gain the Strixhaven Initiate feat and must choose Witherbloom within it.
In addition, if you have the Spellcasting or Pact Magic feature, the spells on the Witherbloom Spells table are added to the spell list of your spellcasting class. (If you are a multiclass character with multiple spell lists, these spells are added to all of them.)
[object Object]
Consider customizing how your spells look when you cast them. Your Witherbloom spells might rely on material components or a spellcasting focus drawn from the swamp environment of Witherbloom, and your spells might take on an appearance suggesting those natural elements. Spectral shapes of swamp animals or plants might form amid your spell effects.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES ('Zhentarim Mercenary', 'A background from FRHoF', '["Intimidation","Perception"]'::jsonb, '["Forgery kit"]'::jsonb, '[]'::jsonb, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

