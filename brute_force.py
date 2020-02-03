'''Brute force find the maxima of a space of shifted harmonics.'''


from scipy import optimize
import numpy
import timeit


def make_curve(amplitudes, phases):
    '''Construct a sum of shifted sine curves.

    Each curve is A sin(k 2pi t + p) where (A, p) are entries of zip(amplitudes, phases)
    and k is the 1-based index of the entry.
    '''
    n = len(amplitudes)
    amplitudes = numpy.array(amplitudes)

    phases = numpy.array(phases)
    harmonics = (1 + numpy.arange(n)) * 2 * numpy.pi

    def f(t):
        return numpy.sum(numpy.sin(harmonics * t + phases) * amplitudes)

    return f


# the period is 1, so we don't need to include 1 in the samples.
fmin_sample_step = 1 / 20
samples = numpy.arange(0, 1, fmin_sample_step)


def maximize(amplitudes, phases):
    f = make_curve(amplitudes, phases)
    # minimizing -f is the same as maximizing f
    def g(t): return -f(t)

    # optimize.fmin returns the argument achieving the local min
    # passing it to f means we get a max of f
    maximizing_f_vals = [f(optimize.fmin(g, z, disp=False)[0]) for z in samples]
    return numpy.max(maximizing_f_vals)


def cartesian_product(*arrays):
    la = len(arrays)
    dtype = numpy.result_type(*arrays)
    arr = numpy.empty([len(a) for a in arrays] + [la], dtype=dtype)
    for i, a in enumerate(numpy.ix_(*arrays)):
        arr[..., i] = a
    return arr.reshape(-1, la)


def compute_space(amplitude_space, phase_space):
    # fundamental frequency's amplitude is fixed to 1 and phase is fixed to 0
    # all other parameters are relative to fundamental.
    space_to_test = cartesian_product(
        amplitude_space, amplitude_space,
        phase_space, phase_space)
    total_space_size = len(space_to_test)
    print(f"Total space to search is {total_space_size}")

    data = numpy.empty((total_space_size, 5))
    percent = 0
    tick = int(total_space_size / 100)

    start_time = timeit.default_timer()

    for i, entry in enumerate(space_to_test):
        if (1 + i) % tick == 0:
            percent += 1
            elapsed = timeit.default_timer() - start_time
            minutes = elapsed / 60
            est_total = minutes / (percent / 100)
            est = est_total - minutes

            print(f"{percent}% ({minutes:.1f}m so far, est. {est:.1f}m remaining)")

        A2, A3, p2, p3 = entry
        max_value = maximize([1, A2, A3], [0, p2, p3])
        data[i, :4] = entry
        data[i, 4] = max_value

    return data


data = compute_space(numpy.arange(0.5, 2, 0.25), numpy.arange(0, 1, 0.2))
numpy.savetxt('phase_space_0.5_2_0.25_0_1_0.2.csv', data, fmt='%.5f',
              delimiter=',', newline='\n', header='A2,A3,p2,p3,max')

data = compute_space(numpy.arange(0.5, 2, 0.1), numpy.arange(0, 1, 0.05))
numpy.savetxt('phase_space_0.5_2_0.1_0_1_0.05.csv', data, fmt='%.7f',
              delimiter=',', newline='\n', header='A2,A3,p2,p3,max')

data = compute_space(numpy.arange(0.5, 2, 0.03), numpy.arange(0, 1, 0.02))
numpy.savetxt('phase_space_0.5_2_0.03_0_1_0.02.csv', data, fmt='%.7f',
              delimiter=',', newline='\n', header='A2,A3,p2,p3,max')
