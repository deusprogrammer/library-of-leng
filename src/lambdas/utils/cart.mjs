import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const cartTableName = process.env.CARTS_TABLE;
const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

const ADJECTIVES_1 = [
  "ancient","arcane","azure","amber","brave","bright","calm","celestial","charmed","clever",
  "crimson","crystal","daring","dawn","deep","divine","dreaming","emerald","enchanted","endless",
  "epic","fair","faithful","fancy","fearless","fierce","frozen","gentle","gilded","glimmering",
  "glorious","golden","grand","great","green","happy","hidden","holy","honest","icy",
  "iron","jade","jolly","keen","kind","legendary","light","lively","lucky","luminous",
  "magic","majestic","merry","mighty","misty","moonlit","mystic","noble","obsidian","peaceful",
  "phantom","primal","proud","pure","quick","radiant","rapid","raven","regal","resolute",
  "royal","runic","sacred","scarlet","serene","shadow","shining","silent","silver","sky",
  "smart","snowy","solar","sparkling","spirited","starry","steady","stormy","strong","sturdy",
  "sunlit","swift","thorny","tidy","timeless","tiny","towering","tranquil","true","twilight",
  "valiant","verdant","vigilant","violet","warm","whimsical","wild","wise","woodland","worthy",
  "young","zealous","bold","cunning","floating","gentlehearted","heroic","humble","infinite","joyful",
  "kindred","laughing","leafy","lonely","lovely","marble","midnight","mirrored","mossy","nimble",
  "opal","painted","patient","pearl","playful","polished","quiet","rainy","restless","rich",
  "river","rocky","rosy","round","royalblue","rugged","rustic","sandy","shimmering","shy",
  "smoky","soft","solid","spring","starlit","still","summer","sunny","sweet","tall",
  "thundering","tinywinged","trusty","velvet","wandering","watchful","white","winter","wondrous","zesty",
  "adventurous","blooming","burnished","chill","cozy","delicate","eager","elegant","feathered","festive",
  "flourishing","fresh","gallant","graceful","harmonic","hearty","hopeful","invincible","jubilant","lucid"
];

const ADJECTIVES_2 = [
  "griffin","dragon","phoenix","wolf","lion","falcon","eagle","bear","fox","raven",
  "owl","stag","hart","tiger","serpent","hydra","wyvern","pegasus","unicorn","chimera",
  "basilisk","kraken","leviathan","sprite","pixie","fairy","dryad","nymph","satyr","centaur",
  "giant","dwarf","elf","gnome","orc","goblin","kobold","troll","ogre","giantborn",
  "wizard","warlock","mage","sorcerer","cleric","paladin","ranger","bard","rogue","druid",
  "knight","guardian","warden","hunter","seeker","wanderer","traveler","champion","sentinel","watcher",
  "oracle","prophet","monk","samurai","ninja","pirate","captain","admiral","king","queen",
  "prince","princess","duke","baron","lord","lady","hero","legend","wandererking","nomad",
  "forest","mountain","river","lake","ocean","meadow","grove","vale","cavern","peak",
  "island","harbor","citadel","castle","fortress","tower","village","kingdom","empire","realm",
  "ember","flame","frost","storm","thunder","lightning","mist","shadow","sun","moon",
  "star","comet","meteor","aurora","eclipse","rainbow","cloud","wind","stone","iron",
  "steel","bronze","silver","gold","crystal","gem","opal","ruby","sapphire","emerald",
  "diamond","pearl","onyx","jade","topaz","quartz","granite","oak","pine","willow",
  "rose","lily","thorn","vine","fern","mushroom","acorn","leaf","branch","bloom",
  "hammer","shield","sword","spear","bow","arrow","helm","armor","banner","lantern",
  "compass","map","scroll","book","relic","artifact","totem","sigil","rune","glyph",
  "echo","whisper","song","dream","spirit","ghost","emberheart","moonfire","sunstone","stormborn"
];

const NOUNS = [
  "acorn","anchor","anvil","apple","arrow","artifact","badge","banner","bastion","beacon",
  "bear","bell","blade","blossom","book","boot","branch","brook","candle","castle",
  "cat","cavern","chalice","charm","citadel","cloud","clover","comet","compass","copper",
  "crown","crystal","dagger","dawn","deer","diamond","dragon","dream","drum","eagle",
  "echo","ember","falcon","feather","fern","fire","flame","flower","forest","forge",
  "fox","frog","garden","gate","gem","ghost","glade","glove","glyph","gold",
  "griffin","grove","hammer","harbor","hawk","heart","helm","hill","horizon","horn",
  "island","jade","jewel","journey","key","king","knight","lake","lantern","leaf",
  "legend","library","light","lion","lute","mage","map","meadow","meteor","mist",
  "moon","mountain","oak","oasis","ocean","onyx","opal","oracle","owl","paladin",
  "path","peak","pearl","phoenix","pine","portal","prism","prophecy","queen","quest",
  "quill","rabbit","rain","raven","realm","relic","river","rose","ruby","rune",
  "saddle","sapphire","scroll","sea","sentinel","shadow","shield","ship","shore","sigil",
  "silver","sky","song","spark","spear","spell","spirit","spring","sprite","stag",
  "star","stone","storm","stream","summit","sun","sword","temple","throne","thunder",
  "tiger","torch","tower","trail","treasure","tree","unicorn","vale","valley","vault",
  "village","vine","violet","wanderer","warden","watchtower","water","whisper","willow","wind",
  "wing","wizard","wolf","wood","wyrm","zeppelin","forgefire","moonlight","sunrise","adventure"
];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function generateCartSlug() {
  return `${randomItem(ADJECTIVES_1)}-${randomItem(ADJECTIVES_2)}-${randomItem(NOUNS)}`;
}

export const getCartById = async (cartId) => {
    if (!cartId) {
        throw new Error("getCartById requires cartId");
    }

    const response = await documentClient.send(
        new QueryCommand({
            TableName: cartTableName,
            KeyConditionExpression: "cartId = :cartId",
            ExpressionAttributeValues: {
                ":cartId": cartId
            }
        })
    );

    const records = response.Items ?? [];

    const meta = records.find(record => record.itemKey === "META");
    const items = records.filter(record => record.itemKey !== "META");

    if (!meta) {
        return undefined;
    }

    return {
        ...meta,
        items
    };
};

export const getCartMetaBySlug = async (shopId, slug) => {
    let response = await documentClient.send(new QueryCommand({
        TableName: cartTableName,
        IndexName: "cart-by-shop-and-slug",
        KeyConditionExpression: "shopId=:shopId AND slug=:slug",
        ExpressionAttributeValues: {
            ":shopId": shopId,
            ":slug": slug
        }
    }))

    const items = response.Items ?? [];

    if (items.length > 1) {
        throw new Error(
            "There should only be one META entry for a shop and cart slug"
        );
    }

    return items[0];
}