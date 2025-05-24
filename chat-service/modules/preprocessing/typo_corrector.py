import re
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage

class TypoCorrector:
    """
    A class to correct typos and minor formatting in text using an LLM.
    """
    def __init__(self, llm: BaseChatModel):
        """
        Initializes the TypoCorrector with a language model.

        Args:
            llm: An instance of BaseChatModel (or a compatible LLM).
        """
        self.llm = llm

    async def correct(self, text: str) -> str:
        """
        Corrects typos and minor formatting in the given text using the LLM.

        Args:
            text: The input string to correct.

        Returns:
            The corrected string, or the original string if no correction is made
            or if an error occurs.
        """
        if not text or not text.strip():
            return "" # Return empty if input is empty or only whitespace

        # Normalize multiple spaces to a single space before sending to LLM
        normalized_text = re.sub(r'\\s+', ' ', text).strip()
        if not normalized_text: # if normalization results in empty string
            return ""

        prompt_template = (
            "You are a text correction assistant. Your sole task is to correct spelling, grammar, and minor formatting errors in the user's input text. "
            "Return ONLY the corrected text. Do not add any explanations, apologies, or conversational phrases. "
            "Preserve the original meaning and intent of the text. "
            "If the text appears to be correct or you are unsure how to correct it without changing the meaning, return the original text. "
            "Do not change proper nouns or technical terms unless they are clearly misspelled common words. "
            "For example, 'note sabout pepperoni pizza' should become 'notes about pepperoni pizza'. 'helo wrld' should become 'hello world'. "
            "If the input is 'Create a note fro John Doe meeting', it should become 'Create a note for John Doe meeting'. "
            "If the input is 'remembr to buy milk', it should become 'remember to buy milk'. "
            "If the input is 'search for myDoc.pdf', it should remain 'search for myDoc.pdf'.\\n\\n"
            "Original text: \"{user_raw_text}\"\\n"
            "Corrected text:"
        )
        
        correction_prompt = prompt_template.format(user_raw_text=normalized_text)
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=correction_prompt)])
            corrected_text = response.content.strip()

            # Basic validation: if LLM returns something very short, empty, or the original query, fallback.
            if not corrected_text or len(corrected_text) < 0.5 * len(normalized_text) and len(normalized_text) > 10: # Heuristic for too short
                print(f"Warning: LLM correction for '{normalized_text}' resulted in a significantly shorter or empty string: '{corrected_text}'. Falling back to normalized original.")
                return normalized_text
            
            # Further check: if the LLM just parrots the prompt or gives a refusal
            if "cannot fulfill" in corrected_text.lower() or "unable to process" in corrected_text.lower():
                print(f"Warning: LLM indicated inability to process for '{normalized_text}'. Falling back to normalized original.")
                return normalized_text

            return corrected_text
        except Exception as e:
            print(f"Error during LLM typo correction for '{normalized_text}': {e}. Falling back to normalized original.")
            return normalized_text # Fallback to original text in case of error
