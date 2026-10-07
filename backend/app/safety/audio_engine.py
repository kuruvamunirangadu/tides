"""
backend/app/safety/audio_engine.py
Generates localized warning broadcasts (Telugu, English, Hindi) for Andhra Pradesh beaches.
"""

from typing import Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel

from app.models.audio import AudioBroadcastPayload, AlertLanguage

# Pre-compiled high-clarity warning templates tailored for AP coastal environments
LOCALIZED_SCRIPTS = {
    "RIP_CURRENT_SURGE": {
        "te-IN": "హెచ్చరిక: సముద్రంలో బలమైన రిప్ కరెంట్ ప్రవాహం ఉంది. నీటిలోకి వెళ్లవద్దు, వెంటనే ఒడ్డుకు రండి.",
        "en-IN": "Warning: High-velocity rip currents detected offshore. Do not enter the water; return to shore immediately.",
        "hi-IN": "चेतावनी: समुद्र में तेज लहरें और रिप करंट प्रवाह है। कृपया पानी से बाहर आएं और किनारे पर रहें。"
    },
    "GEOFENCE_BREACH": {
        "te-IN": "శ్రద్ధ వహించండి: మీరు సురక్షిత సరిహద్దును దాటారు. ప్రమాదకరం, వెంటనే సేఫ్ జోన్లోకి వెనుకకు రండి.",
        "en-IN": "Attention: You have crossed the safe swimming boundary. Return behind the safety flags immediately.",
        "hi-IN": "ध्यान दें: आप सुरक्षित सीमा से बाहर चले गए हैं। तुरंत सुरक्षित क्षेत्र में वापस आएं।"
    },
    "FLAG_ESCALATION_RED": {
        "te-IN": "అత్యవసర హెచ్చరిక: సముద్రం అల్లకల్లోలంగా మారినందున ఎరుపు జెండా ఎగురవేయబడింది. స్నానాలు పూర్తిగా నిషేధించబడ్డాయి.",
        "en-IN": "Emergency Notice: Red Flag is now raised due to hazardous surf conditions. Bathing is strictly prohibited.",
        "hi-IN": "आपातकालीन सूचना: खतरनाक समुद्र की स्थिति के कारण लाल झंडा लगा दिया गया है। समुद्र में जाना प्रतिबंधित है।"
    },
    "TIDAL_RUNUP_SURYALANKA": {
        "te-IN": "హెచ్చరిక: ఆటుపోట్ల కారణంగా వేగంగా నీటి మట్టం పెరుగుతోంది. ఒడ్డున ఉన్న పర్యాటకులు ఎత్తైన ప్రాంతానికి వెళ్లండి.",
        "en-IN": "Notice: Rapid tidal run-up is occurring. Visitors on the sand flats please move immediately to the higher berm.",
        "hi-IN": "चेतावनी: ज्वार के कारण जलस्तर तेजी से बढ़ रहा है। कृपया रेतीले क्षेत्र से ऊंचे स्थान पर जाएं।"
    }
}


class AudioEngine:
    @staticmethod
    def generate_broadcast(
        beach_id: str,
        hazard_type: str,
        severity: str = "CRITICAL"
    ) -> AudioBroadcastPayload:
        script_key = hazard_type if hazard_type in LOCALIZED_SCRIPTS else "RIP_CURRENT_SURGE"
        messages = LOCALIZED_SCRIPTS[script_key]

        return AudioBroadcastPayload(
            broadcast_id=f"BC-{uuid4().hex[:8].upper()}",
            beach_id=beach_id,
            alert_type="RIP_CURRENT_SURGE" if "RIP" in hazard_type else "FLAG_ESCALATION",
            severity=severity,
            messages=messages,
            audio_chime_type="CRITICAL_SIREN" if severity == "CRITICAL" else "STANDARD_WARNING",
            target_speaker_zones=["TOWER_1", "TOWER_2"]
        )


class MultilingualVoicePayload(BaseModel):
    alert_id: str
    hazard_type: str
    target_beach: str
    target_zone: str
    flag_status: str
    telugu: str
    english: str
    hindi: str
    siren_frequency_hz: int = 880
    broadcast_priority: str = "HIGH"


class AudioBroadcastEngine:
    """
    Generates localized tri-lingual speech synthesis broadcasts for coastal siren arrays.
    """

    @staticmethod
    def generate_warning_broadcast(
        alert_id: str,
        hazard_type: str,
        target_beach: str = "Rushikonda Blue Flag Beach",
        target_zone: str = "ZONE_B",
        flag_status: str = "RED",
    ) -> MultilingualVoicePayload:
        
        is_rushikonda = "Rushikonda" in target_beach
        beach_te = "రుషికొండ బ్లూ ఫ్లాగ్ బీచ్" if is_rushikonda else "సూర్యలంక / బాపట్ల బీచ్"
        beach_hi = "रुषिकोंडा ब्लू फ्लैग बीच" if is_rushikonda else "सूर्यलंका / बापटला बीच"

        if hazard_type in ["RIP_CURRENT_FORMATION", "STRONG_CURRENT"]:
            telugu = f"హెచ్చరిక: {beach_te} వద్ద తీవ్రమైన రిప్ కరెంట్ ప్రవాహం ఉంది! దయచేసి ఎరుపు జెండా ప్రాంతంలోకి వెళ్లవద్దు, వెంటనే ఒడ్డుకు రండి."
            english = f"Warning: Dangerous rip current surge active at {target_beach}! Do not enter red-flagged waters, return to shore immediately."
            hindi = f"चेतावनी: {beach_hi} में खतरनाक रिप करंट का बहाव है! कृपया लाल झंडे वाले क्षेत्र से तुरंत बाहर निकलें।"
            siren_hz = 960
            priority = "CRITICAL"

        elif hazard_type in ["HIGH_SURF_ENERGY", "HIGH_WAVES"]:
            telugu = f"తీరప్రాంత హెచ్చరిక: {beach_te} వద్ద సముద్ర అలల ఉధృతి చాలా ఎక్కువగా ఉంది. లోతైన నీటిలోకి దిగడం ప్రమాదకరం."
            english = f"High Surf Advisory: Extreme wave heights at {target_beach}. Swimming is strictly prohibited in hazardous zones."
            hindi = f"तटीय चेतावनी: {beach_hi} में ऊंची लहरें उठ रही हैं। गहरे पानी में तैरना सख्त मना है।"
            siren_hz = 800
            priority = "HIGH"

        elif hazard_type in ["RAPID_TIDAL_SURGE", "RAPID_TIDE"]:
            telugu = f"పోటు హెచ్చరిక: సముద్రపు నీటి మట్టం వేగంగా పెరుగుతోంది. ఇసుక తిన్నెల నుండి వెంటనే సురక్షిత ప్రదేశానికి వెళ్ళండి."
            english = f"Tidal Surge Warning: Rapid incoming tide. Please clear the low-lying sandbars and move to the dry dune line."
            hindi = f"ज्वार चेतावनी: पानी का स्तर तेजी से बढ़ रहा है। कृपया रेतीले किनारों से तुरंत सुरक्षित स्थान पर जाएं।"
            siren_hz = 850
            priority = "HIGH"

        elif hazard_type in ["METEOROLOGICAL_SQUALL", "STORM_SQUALL"]:
            telugu = f"తుఫాను హెచ్చరిక: తీవ్రమైన ఈదురుగాలులు మరియు వర్షం కారణంగా బీచ్ ప్రాంతాన్ని వెంటనే ఖాళీ చేయండి."
            english = f"Emergency Squall Warning: Severe winds and rain approaching. Evacuate all water and beach zones immediately."
            hindi = f"तूफान चेतावनी: तेज आंधी और बारिश के कारण सभी लोग तुरंत समुद्र तट से बाहर आएं।"
            siren_hz = 1040
            priority = "CRITICAL"

        elif hazard_type == "RESTRICTED_ZONE_BREACH":
            telugu = f"భద్రతా హెచ్చరిక: మీరు నిషేధిత రాతి ప్రాంతంలో ఉన్నారు. ప్రమాదం ఉంది, వెంటనే వెనక్కి రండి."
            english = f"Security Advisory: You have entered a restricted rocky zone. Immediate retreat required."
            hindi = f"सुरक्षा चेतावनी: आप प्रतिबंधित चट्टानी क्षेत्र में हैं। कृपया तुरंत वापस लौटें।"
            siren_hz = 750
            priority = "HIGH"

        else:
            telugu = f"బీచ్ భద్రతా సూచన: లైఫ్‌గార్డ్ సూచనలను పాటించండి మరియు నిర్దేశిత సురక్షిత జోన్‌లో మాత్రమే స్నానం చేయండి."
            english = f"Beach Safety Advisory: Follow lifeguard instructions and swim only within marked green flag zones."
            hindi = f"बीच सुरक्षा सूचना: लाइफगार्ड के निर्देशों का पालन करें और केवल सुरक्षित क्षेत्र में ही तैरें।"
            siren_hz = 600
            priority = "NORMAL"

        return MultilingualVoicePayload(
            alert_id=alert_id,
            hazard_type=hazard_type,
            target_beach=target_beach,
            target_zone=target_zone,
            flag_status=flag_status,
            telugu=telugu,
            english=english,
            hindi=hindi,
            siren_frequency_hz=siren_hz,
            broadcast_priority=priority,
        )
