export default function resample(input, inputRate, outputRate) {
    if (inputRate === outputRate) {
        return input;
    }

    const ratio = inputRate / outputRate;
    const length = Math.floor(input.length / ratio);
    const output = new Float32Array(length);

    for (let i = 0; i < length; i++) {
        const position = i * ratio;
        const index = Math.floor(position);
        const fraction = position - index;

        const a = input[index];
        const b = input[Math.min(index + 1, input.length - 1)];

        output[i] = a + (b - a) * fraction;
    }

    return output;
}
